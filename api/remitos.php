<?php
/**
 * Delivery Notes (Remitos) API
 * Handles GET, POST, PUT, DELETE for delivery note management
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$db = getDB();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // GET: List delivery notes with optional filters
    $storeId = getQueryParam('storeId');
    $supplierId = getQueryParam('supplierId');
    $month = getQueryParam('month');
    $year = getQueryParam('year');

    $query = '
        SELECT dn.*,
            s.id as store_id, s.name as store_name,
            sup.id as supplier_id_rel, sup.name as supplier_name
        FROM delivery_notes dn
        JOIN stores s ON s.id = dn.store_id
        LEFT JOIN suppliers sup ON sup.id = dn.supplier_id
        WHERE 1=1
    ';
    $params = [];

    if ($storeId) {
        $query .= ' AND dn.store_id = ?';
        $params[] = $storeId;
    }

    if ($supplierId) {
        $query .= ' AND dn.supplier_id = ?';
        $params[] = $supplierId;
    }

    if ($month && $year) {
        $firstDay = date('Y-m-01', mktime(0, 0, 0, $month, 1, $year));
        $lastDay = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));
        $query .= ' AND dn.date >= ? AND dn.date <= ?';
        $params[] = $firstDay;
        $params[] = $lastDay;
    }

    $query .= ' ORDER BY dn.date DESC';

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $remitos = $stmt->fetchAll();

    // Fetch items for each delivery note
    $remitosWithItems = [];
    foreach ($remitos as $remito) {
        $itemsStmt = $db->prepare('
            SELECT dni.*, p.id as product_id_rel, p.name as product_name
            FROM delivery_note_items dni
            LEFT JOIN products p ON p.id = dni.product_id
            WHERE dni.delivery_note_id = ?
            ORDER BY dni.created_at ASC
        ');
        $itemsStmt->execute([$remito['id']]);
        $items = $itemsStmt->fetchAll();

        $remito['items'] = $items;
        $remito['store'] = [
            'id' => $remito['store_id'],
            'name' => $remito['store_name']
        ];
        $remito['supplier'] = $remito['supplier_id_rel'] ? [
            'id' => $remito['supplier_id_rel'],
            'name' => $remito['supplier_name']
        ] : null;

        unset($remito['store_id'], $remito['store_name'], $remito['supplier_id_rel'], $remito['supplier_name']);
        $remitosWithItems[] = $remito;
    }

    jsonResponse(['remitos' => $remitosWithItems]);

} elseif ($method === 'POST') {
    // POST: Create delivery note(s)
    $body = getRequestBody();

    // Handle batch insert
    if (isset($body['remitos']) && is_array($body['remitos'])) {
        $created = [];
        $skipped = [];

        foreach ($body['remitos'] as $index => $remito) {
            // Check for duplicate
            $dupQuery = 'SELECT id FROM delivery_notes WHERE 1=1';
            $dupParams = [];

            if ($remito['supplier_id'] ?? null) {
                $dupQuery .= ' AND supplier_id = ?';
                $dupParams[] = $remito['supplier_id'];
            }

            if ($remito['note_number'] ?? null) {
                $dupQuery .= ' AND note_number = ?';
                $dupParams[] = $remito['note_number'];
            }

            if ($remito['date'] ?? null) {
                $dupQuery .= ' AND date = ?';
                $dupParams[] = $remito['date'];
            }

            $dupQuery .= ' AND store_id = ?';
            $dupParams[] = $remito['store_id'];

            $dupStmt = $db->prepare($dupQuery);
            $dupStmt->execute($dupParams);
            $duplicate = $dupStmt->fetch();

            if ($duplicate) {
                $skipped[] = ['index' => $index, 'reason' => 'duplicate'];
                continue;
            }

            // Create delivery note
            $remotoId = generateId();
            $insertStmt = $db->prepare('
                INSERT INTO delivery_notes (
                    id, store_id, supplier_id, note_number, date, total, currency, status,
                    image_url, ocr_raw_data, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ');

            $insertStmt->execute([
                $remotoId,
                $remito['store_id'],
                $remito['supplier_id'] ?? null,
                $remito['note_number'] ?? null,
                $remito['date'],
                $remito['total'] ?? 0,
                $remito['currency'] ?? 'ARS',
                $remito['status'] ?? 'pending',
                $remito['image_url'] ?? null,
                $remito['ocr_raw_data'] ?? null,
                $remito['notes'] ?? null
            ]);

            // Insert items
            if (isset($remito['items']) && is_array($remito['items'])) {
                foreach ($remito['items'] as $item) {
                    $itemId = generateId();
                    $itemStmt = $db->prepare('
                        INSERT INTO delivery_note_items (
                            id, delivery_note_id, product_id, quantity, unit_price, subtotal, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ');

                    $itemStmt->execute([
                        $itemId,
                        $remotoId,
                        $item['product_id'] ?? null,
                        $item['quantity'] ?? 0,
                        $item['unit_price'] ?? 0,
                        $item['subtotal'] ?? 0
                    ]);
                }
            }

            $created[] = ['id' => $remotoId, 'index' => $index];
        }

        jsonResponse(['created' => $created, 'skipped' => $skipped], 201);
    } else {
        // Single insert
        $remito = $body;

        // Check for duplicate
        $dupQuery = 'SELECT id FROM delivery_notes WHERE 1=1';
        $dupParams = [];

        if ($remito['supplier_id'] ?? null) {
            $dupQuery .= ' AND supplier_id = ?';
            $dupParams[] = $remito['supplier_id'];
        }

        if ($remito['note_number'] ?? null) {
            $dupQuery .= ' AND note_number = ?';
            $dupParams[] = $remito['note_number'];
        }

        if ($remito['date'] ?? null) {
            $dupQuery .= ' AND date = ?';
            $dupParams[] = $remito['date'];
        }

        $dupQuery .= ' AND store_id = ?';
        $dupParams[] = $remito['store_id'];

        $dupStmt = $db->prepare($dupQuery);
        $dupStmt->execute($dupParams);
        $duplicate = $dupStmt->fetch();

        if ($duplicate) {
            jsonError('Duplicate delivery note', 409);
        }

        // Create delivery note
        $remotoId = generateId();
        $insertStmt = $db->prepare('
            INSERT INTO delivery_notes (
                id, store_id, supplier_id, note_number, date, total, currency, status,
                image_url, ocr_raw_data, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ');

        $insertStmt->execute([
            $remotoId,
            $remito['store_id'],
            $remito['supplier_id'] ?? null,
            $remito['note_number'] ?? null,
            $remito['date'],
            $remito['total'] ?? 0,
            $remito['currency'] ?? 'ARS',
            $remito['status'] ?? 'pending',
            $remito['image_url'] ?? null,
            $remito['ocr_raw_data'] ?? null,
            $remito['notes'] ?? null
        ]);

        // Insert items
        if (isset($remito['items']) && is_array($remito['items'])) {
            foreach ($remito['items'] as $item) {
                $itemId = generateId();
                $itemStmt = $db->prepare('
                    INSERT INTO delivery_note_items (
                        id, delivery_note_id, product_id, quantity, unit_price, subtotal, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                ');

                $itemStmt->execute([
                    $itemId,
                    $remotoId,
                    $item['product_id'] ?? null,
                    $item['quantity'] ?? 0,
                    $item['unit_price'] ?? 0,
                    $item['subtotal'] ?? 0
                ]);
            }
        }

        jsonResponse(['id' => $remotoId], 201);
    }

} elseif ($method === 'PUT') {
    // PUT: Update delivery note
    $body = getRequestBody();

    if (!isset($body['id'])) {
        jsonError('ID required for update', 400);
    }

    $id = $body['id'];

    // Verify exists
    $checkStmt = $db->prepare('SELECT id FROM delivery_notes WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonError('Delivery note not found', 404);
    }

    // Update main record
    $updateStmt = $db->prepare('
        UPDATE delivery_notes SET
            store_id = ?,
            supplier_id = ?,
            note_number = ?,
            date = ?,
            total = ?,
            currency = ?,
            status = ?,
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
    ');

    $updateStmt->execute([
        $body['store_id'],
        $body['supplier_id'] ?? null,
        $body['note_number'] ?? null,
        $body['date'],
        $body['total'] ?? 0,
        $body['currency'] ?? 'ARS',
        $body['status'] ?? 'pending',
        $body['notes'] ?? null,
        $id
    ]);

    // Replace items if provided
    if (isset($body['items']) && is_array($body['items'])) {
        $db->prepare('DELETE FROM delivery_note_items WHERE delivery_note_id = ?')->execute([$id]);

        foreach ($body['items'] as $item) {
            $itemId = generateId();
            $itemStmt = $db->prepare('
                INSERT INTO delivery_note_items (
                    id, delivery_note_id, product_id, quantity, unit_price, subtotal, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            ');

            $itemStmt->execute([
                $itemId,
                $id,
                $item['product_id'] ?? null,
                $item['quantity'] ?? 0,
                $item['unit_price'] ?? 0,
                $item['subtotal'] ?? 0
            ]);
        }
    }

    jsonResponse(['ok' => true]);

} elseif ($method === 'DELETE') {
    // DELETE: Remove delivery note
    $id = getQueryParam('id');

    if (!$id) {
        jsonError('ID required for deletion', 400);
    }

    // Verify exists
    $checkStmt = $db->prepare('SELECT id FROM delivery_notes WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonError('Delivery note not found', 404);
    }

    // Delete items first
    $db->prepare('DELETE FROM delivery_note_items WHERE delivery_note_id = ?')->execute([$id]);

    // Delete note
    $db->prepare('DELETE FROM delivery_notes WHERE id = ?')->execute([$id]);

    jsonResponse(['ok' => true]);

} else {
    requireMethod(['GET', 'POST', 'PUT', 'DELETE']);
}
