<?php
/**
 * Stock Trend API
 * GET only - provides stock trend data for products over time
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireMethod('GET');
requireAuth();
$db = getDB();

$storeId = getQueryParam('storeId');
$productId = getQueryParam('productId');
$limit = (int)(getQueryParam('limit') ?? 12);

if (!$storeId) {
    jsonError('storeId parameter required', 400);
}

// Get last N stock snapshots for store
$snapshotsQuery = '
    SELECT id, date
    FROM stock_snapshots
    WHERE store_id = ?
    ORDER BY date DESC
    LIMIT ?
';

$stmt = $db->prepare($snapshotsQuery);
$stmt->execute([$storeId, $limit]);
$snapshots = $stmt->fetchAll();

// Reverse to chronological order
$snapshots = array_reverse($snapshots);

if ($productId) {
    // Single product trend
    $trend = [];

    foreach ($snapshots as $snapshot) {
        $itemStmt = $db->prepare('
            SELECT quantity, p.name as product_name
            FROM stock_snapshot_items ssi
            LEFT JOIN products p ON p.id = ssi.product_id
            WHERE ssi.snapshot_id = ? AND ssi.product_id = ?
            LIMIT 1
        ');
        $itemStmt->execute([$snapshot['id'], $productId]);
        $item = $itemStmt->fetch();

        if ($item) {
            $trend[] = [
                'date' => $snapshot['date'],
                'quantity' => (float)$item['quantity'],
                'product_name' => $item['product_name']
            ];
        }
    }

    jsonResponse(['product_id' => $productId, 'trend' => $trend]);
} else {
    // All products trend
    $allProducts = [];
    $productNames = [];

    // First pass: collect all products
    foreach ($snapshots as $snapshot) {
        $itemsStmt = $db->prepare('
            SELECT ssi.product_id, ssi.quantity, p.name as product_name
            FROM stock_snapshot_items ssi
            LEFT JOIN products p ON p.id = ssi.product_id
            WHERE ssi.snapshot_id = ?
            ORDER BY p.name ASC
        ');
        $itemsStmt->execute([$snapshot['id']]);
        $items = $itemsStmt->fetchAll();

        foreach ($items as $item) {
            if ($item['product_id']) {
                if (!isset($allProducts[$item['product_id']])) {
                    $allProducts[$item['product_id']] = [
                        'product_id' => $item['product_id'],
                        'product_name' => $item['product_name'],
                        'trend' => []
                    ];
                    $productNames[$item['product_id']] = $item['product_name'];
                }

                $allProducts[$item['product_id']]['trend'][] = [
                    'date' => $snapshot['date'],
                    'quantity' => (float)$item['quantity']
                ];
            }
        }
    }

    // Sort products by name
    uasort($allProducts, function ($a, $b) {
        return strcmp($a['product_name'], $b['product_name']);
    });

    jsonResponse(['products' => array_values($allProducts)]);
}
