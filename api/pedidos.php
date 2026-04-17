<?php
/**
 * Purchase Orders API
 * Handles GET (schedule, recommendations, history) and POST, PUT for order management
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$db = getDB();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = getQueryParam('action');

    if ($action === 'schedule') {
        // Get delivery schedule from app_settings
        $stmt = $db->prepare('
            SELECT value
            FROM app_settings
            WHERE key = ?
            LIMIT 1
        ');
        $stmt->execute(['delivery_schedule']);
        $setting = $stmt->fetch();

        if (!$setting) {
            jsonResponse(['schedule' => []]);
        }

        $schedule = json_decode($setting['value'], true) ?? [];
        jsonResponse(['schedule' => $schedule]);

    } elseif ($action === 'recommend') {
        // Get recommendations for ordering
        $storeId = getQueryParam('storeId');
        $dayOfWeek = getQueryParam('dayOfWeek');

        if (!$storeId) {
            jsonError('storeId parameter required', 400);
        }

        // Get schedule for day
        $stmt = $db->prepare('
            SELECT value
            FROM app_settings
            WHERE key = ?
            LIMIT 1
        ');
        $stmt->execute(['delivery_schedule']);
        $setting = $stmt->fetch();

        $schedule = json_decode($setting['value'], true) ?? [];
        $daySchedule = $schedule[$dayOfWeek] ?? null;

        if (!$daySchedule) {
            jsonResponse(['recommendations' => []]);
        }

        $coverageDays = $daySchedule['coverage_days'] ?? 7;

        // Get latest stock snapshot for store
        $snapshotStmt = $db->prepare('
            SELECT id FROM stock_snapshots
            WHERE store_id = ?
            ORDER BY date DESC
            LIMIT 1
        ');
        $snapshotStmt->execute([$storeId]);
        $snapshot = $snapshotStmt->fetch();

        // Get consumption baselines for store
        $baselinesStmt = $db->prepare('
            SELECT product_id, avg_daily_usage
            FROM consumption_baselines
            WHERE store_id = ?
        ');
        $baselinesStmt->execute([$storeId]);
        $baselines = $baselinesStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Get all products linked to BLANCALUNA supplier (or check supplier name)
        $productsStmt = $db->prepare('
            SELECT p.id, p.name, p.safety_stock, p.rounding_unit
            FROM products p
            JOIN product_suppliers ps ON ps.product_id = p.id
            JOIN suppliers s ON s.id = ps.supplier_id
            WHERE s.name = ? OR s.eerr_label = ?
            ORDER BY p.name ASC
        ');
        $productsStmt->execute(['Blanca Luna', 'Blanca Luna']);
        $products = $productsStmt->fetchAll();

        // Build recommendations
        $recommendations = [];

        foreach ($products as $product) {
            $productId = $product['id'];

            // Get current stock
            $stockActual = 0;
            if ($snapshot) {
                $itemStmt = $db->prepare('
                    SELECT quantity FROM stock_snapshot_items
                    WHERE snapshot_id = ? AND product_id = ?
                    LIMIT 1
                ');
                $itemStmt->execute([$snapshot['id'], $productId]);
                $item = $itemStmt->fetch();
                $stockActual = (float)($item['quantity'] ?? 0);
            }

            // Get avg daily usage
            $avgDailyUsage = (float)($baselines[$productId] ?? 0);

            // Calculate targets
            $safetyStock = (float)($product['safety_stock'] ?? 0);
            $stockTarget = ($avgDailyUsage * $coverageDays) + $safetyStock;
            $suggestedQty = max(0, $stockTarget - $stockActual);

            // Round if rounding unit specified
            $roundingUnit = (float)($product['rounding_unit'] ?? 0);
            $roundedQty = $suggestedQty;

            if ($roundingUnit > 0) {
                $roundedQty = ceil($suggestedQty / $roundingUnit) * $roundingUnit;
            }

            $recommendations[] = [
                'product_id' => $productId,
                'product_name' => $product['name'],
                'stock_actual' => $stockActual,
                'avg_daily_usage' => $avgDailyUsage,
                'coverage_days' => $coverageDays,
                'safety_stock' => $safetyStock,
                'stock_target' => $stockTarget,
                'suggested_qty' => $suggestedQty,
                'rounded_qty' => $roundedQty,
                'rounding_unit' => $roundingUnit
            ];
        }

        jsonResponse(['recommendations' => $recommendations]);

    } else {
        // Return order history (last 50)
        $storeId = getQueryParam('storeId');

        $query = '
            SELECT po.*, s.id as store_id_rel, s.name as store_name
            FROM purchase_orders po
            JOIN stores s ON s.id = po.store_id
        ';

        $params = [];

        if ($storeId) {
            $query .= ' WHERE po.store_id = ?';
            $params[] = $storeId;
        }

        $query .= ' ORDER BY po.created_at DESC LIMIT 50';

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        // Fetch items for each order
        $ordersWithItems = [];
        foreach ($orders as $order) {
            $itemsStmt = $db->prepare('
                SELECT poi.*, p.id as product_id_rel, p.name as product_name
                FROM purchase_order_items poi
                LEFT JOIN products p ON p.id = poi.product_id
                WHERE poi.order_id = ?
                ORDER BY poi.created_at ASC
            ');
            $itemsStmt->execute([$order['id']]);
            $items = $itemsStmt->fetchAll();

            $order['store'] = [
                'id' => $order['store_id_rel'],
                'name' => $order['store_name']
            ];
            $order['items'] = $items;

            unset($order['store_id_rel'], $order['store_name']);

            $ordersWithItems[] = $order;
        }

        jsonResponse(['orders' => $ordersWithItems]);
    }

} elseif ($method === 'POST') {
    // Create order
    $body = getRequestBody();

    $orderId = generateId();
    $orderDate = $body['order_date'] ?? getCurrentDate();

    $stmt = $db->prepare('
        INSERT INTO purchase_orders (
            id, store_id, order_date, delivery_date, coverage_days,
            status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');

    $stmt->execute([
        $orderId,
        $body['store_id'],
        $orderDate,
        $body['delivery_date'],
        $body['coverage_days'],
        $body['status'] ?? 'pending',
        $body['notes'] ?? null
    ]);

    // Insert items
    if (isset($body['items']) && is_array($body['items'])) {
        foreach ($body['items'] as $item) {
            $itemId = generateId();
            $itemStmt = $db->prepare('
                INSERT INTO purchase_order_items (
                    id, order_id, product_id, stock_actual, avg_daily_usage,
                    coverage_days, safety_stock, stock_target, suggested_qty,
                    final_qty, rounding_unit, calculation_detail, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ');

            $itemStmt->execute([
                $itemId,
                $orderId,
                $item['product_id'] ?? null,
                (float)($item['stock_actual'] ?? 0),
                (float)($item['avg_daily_usage'] ?? 0),
                (int)($item['coverage_days'] ?? 0),
                (float)($item['safety_stock'] ?? 0),
                (float)($item['stock_target'] ?? 0),
                (float)($item['suggested_qty'] ?? 0),
                (float)($item['final_qty'] ?? 0),
                (float)($item['rounding_unit'] ?? 0),
                $item['calculation_detail'] ?? null
            ]);
        }
    }

    jsonResponse(['id' => $orderId], 201);

} elseif ($method === 'PUT') {
    // Update order status/notes and optionally items
    $body = getRequestBody();

    if (!isset($body['id'])) {
        jsonError('ID required for update', 400);
    }

    $id = $body['id'];

    // Verify exists
    $checkStmt = $db->prepare('SELECT id FROM purchase_orders WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonError('Purchase order not found', 404);
    }

    // Update main record
    $updateStmt = $db->prepare('
        UPDATE purchase_orders SET
            status = ?,
            notes = ?,
            updated_at = NOW()
        WHERE id = ?
    ');

    $updateStmt->execute([
        $body['status'] ?? 'pending',
        $body['notes'] ?? null,
        $id
    ]);

    // Update item final_qty if provided
    if (isset($body['items']) && is_array($body['items'])) {
        foreach ($body['items'] as $item) {
            if (isset($item['id'])) {
                $itemUpdateStmt = $db->prepare('
                    UPDATE purchase_order_items SET
                        final_qty = ?
                    WHERE id = ?
                ');

                $itemUpdateStmt->execute([
                    (float)($item['final_qty'] ?? 0),
                    $item['id']
                ]);
            }
        }
    }

    jsonResponse(['ok' => true]);

} else {
    requireMethod(['GET', 'POST', 'PUT']);
}
