<?php
/**
 * Stock Adjustments API
 * Handles GET, POST, DELETE for stock adjustment records
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$db = getDB();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // List adjustments with optional filters
    $storeId = getQueryParam('storeId');
    $productId = getQueryParam('productId');
    $limit = (int)(getQueryParam('limit') ?? 50);

    $query = '
        SELECT sa.*,
            s.id as store_id_rel, s.name as store_name,
            p.id as product_id_rel, p.name as product_name
        FROM stock_adjustments sa
        JOIN stores s ON s.id = sa.store_id
        LEFT JOIN products p ON p.id = sa.product_id
        WHERE 1=1
    ';

    $params = [];

    if ($storeId) {
        $query .= ' AND sa.store_id = ?';
        $params[] = $storeId;
    }

    if ($productId) {
        $query .= ' AND sa.product_id = ?';
        $params[] = $productId;
    }

    $query .= ' ORDER BY sa.date DESC LIMIT ?';
    $params[] = $limit;

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $adjustments = $stmt->fetchAll();

    // Format response
    $adjustmentsFormatted = [];
    foreach ($adjustments as $adj) {
        $adj['store'] = [
            'id' => $adj['store_id_rel'],
            'name' => $adj['store_name']
        ];
        $adj['product'] = $adj['product_id_rel'] ? [
            'id' => $adj['product_id_rel'],
            'name' => $adj['product_name']
        ] : null;

        unset($adj['store_id_rel'], $adj['store_name'], $adj['product_id_rel'], $adj['product_name']);
        $adjustmentsFormatted[] = $adj;
    }

    jsonResponse(['adjustments' => $adjustmentsFormatted]);

} elseif ($method === 'POST') {
    // Create adjustment
    $body = getRequestBody();

    $adjustmentId = generateId();

    $stmt = $db->prepare('
        INSERT INTO stock_adjustments (
            id, store_id, product_id, date, quantity, type, reason, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');

    $stmt->execute([
        $adjustmentId,
        $body['store_id'],
        $body['product_id'],
        $body['date'],
        $body['quantity'],
        $body['type'] ?? 'correction',
        $body['reason'] ?? null,
        $body['notes'] ?? null
    ]);

    jsonResponse(['id' => $adjustmentId], 201);

} elseif ($method === 'DELETE') {
    // Delete adjustment
    $id = getQueryParam('id');

    if (!$id) {
        jsonError('ID required for deletion', 400);
    }

    // Verify exists
    $checkStmt = $db->prepare('SELECT id FROM stock_adjustments WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonError('Stock adjustment not found', 404);
    }

    // Delete adjustment
    $db->prepare('DELETE FROM stock_adjustments WHERE id = ?')->execute([$id]);

    jsonResponse(['ok' => true]);

} else {
    requireMethod(['GET', 'POST', 'DELETE']);
}
