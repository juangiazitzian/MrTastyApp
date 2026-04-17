<?php
/**
 * Stock Snapshots API
 * Handles GET, POST, PUT, DELETE for stock snapshot management
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$db = getDB();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $latest = getQueryParam('latest');
    $storeIdParam = getQueryParam('storeId');

    if ($latest === 'true' && $storeIdParam) {
        // Get latest snapshot for store with items and products
        $stmt = $db->prepare('
            SELECT ss.*, s.name as store_name
            FROM stock_snapshots ss
            JOIN stores s ON s.id = ss.store_id
            WHERE ss.store_id = ?
            ORDER BY ss.date DESC
            LIMIT 1
        ');
        $stmt->execute([$storeIdParam]);
        $snapshot = $stmt->fetch();

        if (!$snapshot) {
            jsonResponse(['snapshot' => null]);
        }

        // Fetch items with products
        $itemsStmt = $db->prepare('
            SELECT ssi.*, p.id as product_id_rel, p.name as product_name
            FROM stock_snapshot_items ssi
            LEFT JOIN products p ON p.id = ssi.product_id
            WHERE ssi.snapshot_id = ?
            ORDER BY ssi.created_at ASC
        ');
        $itemsStmt->execute([$snapshot['id']]);
        $items = $itemsStmt->fetchAll();

        $snapshot['store'] = [
            'id' => $snapshot['store_id'],
            'name' => $snapshot['store_name']
        ];
        $snapshot['items'] = $items;

        unset($snapshot['store_id'], $snapshot['store_name']);

        jsonResponse(['snapshot' => $snapshot]);
    } else {
        // List snapshots with optional store filter
        $query = '
            SELECT ss.*, s.name as store_name, s.id as store_id_rel
            FROM stock_snapshots ss
            JOIN stores s ON s.id = ss.store_id
        ';

        $params = [];

        if ($storeIdParam) {
            $query .= ' WHERE ss.store_id = ?';
            $params[] = $storeIdParam;
        }

        $query .= ' ORDER BY ss.date DESC LIMIT 50';

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $snapshots = $stmt->fetchAll();

        // Fetch items for each snapshot
        $snapshotsWithItems = [];
        foreach ($snapshots as $snapshot) {
            $itemsStmt = $db->prepare('
                SELECT ssi.*, p.id as product_id_rel, p.name as product_name
                FROM stock_snapshot_items ssi
                LEFT JOIN products p ON p.id = ssi.product_id
                WHERE ssi.snapshot_id = ?
                ORDER BY ssi.created_at ASC
            ');
            $itemsStmt->execute([$snapshot['id']]);
            $items = $itemsStmt->fetchAll();

            $snapshot['store'] = [
                'id' => $snapshot['store_id_rel'],
                'name' => $snapshot['store_name']
            ];
            $snapshot['items'] = $items;

            unset($snapshot['store_id_rel'], $snapshot['store_name']);

            $snapshotsWithItems[] = $snapshot;
        }

        jsonResponse(['snapshots' => $snapshotsWithItems]);
    }

} elseif ($method === 'POST') {
    // Create snapshot
    $body = getRequestBody();

    $snapshotId = generateId();
    $date = $body['date'] ?? getCurrentDate();

    $stmt = $db->prepare('
        INSERT INTO stock_snapshots (
            id, store_id, date, source, image_url, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');

    $stmt->execute([
        $snapshotId,
        $body['store_id'],
        $date,
        $body['source'] ?? null,
        $body['image_url'] ?? null,
        $body['notes'] ?? null
    ]);

    // Insert items
    if (isset($body['items']) && is_array($body['items'])) {
        foreach ($body['items'] as $item) {
            $itemId = generateId();
            $itemStmt = $db->prepare('
                INSERT INTO stock_snapshot_items (
                    id, snapshot_id, product_id, quantity, created_at
                ) VALUES (?, ?, ?, ?, NOW())
            ');

            $itemStmt->execute([
                $itemId,
                $snapshotId,
                $item['product_id'] ?? null,
                $item['quantity'] ?? 0
            ]);
        }
    }

    jsonResponse(['id' => $snapshotId], 201);

} elseif ($method === 'PUT') {
    // Update snapshot
    $body = getRequestBody();

    if (!isset($body['id'])) {
        jsonError('ID required for update', 400);
    }

    $id = $body['id'];

    // Verify exists
    $checkStmt = $db->prepare('SELECT id FROM stock_snapshots WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonError('Stock snapshot not found', 404);
    }

    // Update main record
    $updateStmt = $db->prepare('
        UPDATE stock_snapshots SET
            store_id = ?,
            date = ?,
            source = ?,
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
    ');

    $updateStmt->execute([
        $body['store_id'],
        $body['date'] ?? getCurrentDate(),
        $body['source'] ?? null,
        $body['notes'] ?? null,
        $id
    ]);

    // Replace items if provided
    if (isset($body['items']) && is_array($body['items'])) {
        $db->prepare('DELETE FROM stock_snapshot_items WHERE snapshot_id = ?')->execute([$id]);

        foreach ($body['items'] as $item) {
            $itemId = generateId();
            $itemStmt = $db->prepare('
                INSERT INTO stock_snapshot_items (
                    id, snapshot_id, product_id, quantity, created_at
                ) VALUES (?, ?, ?, ?, NOW())
            ');

            $itemStmt->execute([
                $itemId,
                $id,
                $item['product_id'] ?? null,
                $item['quantity'] ?? 0
            ]);
        }
    }

    jsonResponse(['ok' => true]);

} elseif ($method === 'DELETE') {
    // Delete snapshot
    $id = getQueryParam('id');

    if (!$id) {
        jsonError('ID required for deletion', 400);
    }

    // Verify exists
    $checkStmt = $db->prepare('SELECT id FROM stock_snapshots WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonError('Stock snapshot not found', 404);
    }

    // Delete items first
    $db->prepare('DELETE FROM stock_snapshot_items WHERE snapshot_id = ?')->execute([$id]);

    // Delete snapshot
    $db->prepare('DELETE FROM stock_snapshots WHERE id = ?')->execute([$id]);

    jsonResponse(['ok' => true]);

} else {
    requireMethod(['GET', 'POST', 'PUT', 'DELETE']);
}
