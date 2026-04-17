<?php
/**
 * Stock Consumption Calculator API
 * Handles GET (fetch consumption baselines) and POST (calculate consumption)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$db = getDB();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get consumption baselines with product and store info
    $storeId = getQueryParam('storeId');

    $query = '
        SELECT cb.*,
            s.id as store_id_rel, s.name as store_name,
            p.id as product_id_rel, p.name as product_name
        FROM consumption_baselines cb
        JOIN stores s ON s.id = cb.store_id
        LEFT JOIN products p ON p.id = cb.product_id
    ';

    $params = [];

    if ($storeId) {
        $query .= ' WHERE cb.store_id = ?';
        $params[] = $storeId;
    }

    $query .= ' ORDER BY p.name ASC';

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $baselines = $stmt->fetchAll();

    // Format response
    $baselinesFormatted = [];
    foreach ($baselines as $baseline) {
        $baseline['store'] = [
            'id' => $baseline['store_id_rel'],
            'name' => $baseline['store_name']
        ];
        $baseline['product'] = $baseline['product_id_rel'] ? [
            'id' => $baseline['product_id_rel'],
            'name' => $baseline['product_name']
        ] : null;

        unset($baseline['store_id_rel'], $baseline['store_name'], $baseline['product_id_rel'], $baseline['product_name']);
        $baselinesFormatted[] = $baseline;
    }

    jsonResponse(['baselines' => $baselinesFormatted]);

} elseif ($method === 'POST') {
    // Calculate consumption and save to baselines
    $body = getRequestBody();

    if (!isset($body['store_id'])) {
        jsonError('store_id required', 400);
    }

    $storeId = $body['store_id'];

    // Get all stock snapshots for store, ordered by date ASC
    $snapshotStmt = $db->prepare('
        SELECT id, date, created_at
        FROM stock_snapshots
        WHERE store_id = ?
        ORDER BY date ASC
    ');
    $snapshotStmt->execute([$storeId]);
    $snapshots = $snapshotStmt->fetchAll();

    if (count($snapshots) < 2) {
        jsonError('At least 2 stock snapshots required to calculate consumption', 400);
    }

    $periods = [];
    $productConsumption = [];

    // Process consecutive snapshot pairs
    for ($i = 0; $i < count($snapshots) - 1; $i++) {
        $snapshotA = $snapshots[$i];
        $snapshotB = $snapshots[$i + 1];

        $dateA = new DateTime($snapshotA['date']);
        $dateB = new DateTime($snapshotB['date']);
        $daysBetween = $dateB->diff($dateA)->days;

        if ($daysBetween <= 0) {
            continue;
        }

        // Get items from both snapshots
        $itemsAStmt = $db->prepare('
            SELECT product_id, quantity
            FROM stock_snapshot_items
            WHERE snapshot_id = ?
        ');
        $itemsAStmt->execute([$snapshotA['id']]);
        $itemsA = $itemsAStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $itemsBStmt = $db->prepare('
            SELECT product_id, quantity
            FROM stock_snapshot_items
            WHERE snapshot_id = ?
        ');
        $itemsBStmt->execute([$snapshotB['id']]);
        $itemsB = $itemsBStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Get all product IDs involved
        $allProducts = array_unique(array_merge(array_keys($itemsA), array_keys($itemsB)));

        foreach ($allProducts as $productId) {
            $stockA = (float)($itemsA[$productId] ?? 0);
            $stockB = (float)($itemsB[$productId] ?? 0);

            // Get purchases in period
            $purchasesStmt = $db->prepare('
                SELECT SUM(dni.quantity) as total
                FROM delivery_note_items dni
                JOIN delivery_notes dn ON dn.id = dni.delivery_note_id
                WHERE dn.store_id = ? AND dni.product_id = ?
                AND dn.date >= ? AND dn.date < ?
            ');
            $purchasesStmt->execute([$storeId, $productId, $snapshotA['date'], $snapshotB['date']]);
            $purchaseResult = $purchasesStmt->fetch();
            $purchases = (float)($purchaseResult['total'] ?? 0);

            // Get adjustments in period
            $adjustmentsStmt = $db->prepare('
                SELECT SUM(quantity) as total
                FROM stock_adjustments
                WHERE store_id = ? AND product_id = ?
                AND date >= ? AND date < ?
            ');
            $adjustmentsStmt->execute([$storeId, $productId, $snapshotA['date'], $snapshotB['date']]);
            $adjustmentResult = $adjustmentsStmt->fetch();
            $adjustments = (float)($adjustmentResult['total'] ?? 0);

            // consumption = stockA + purchases - stockB - adjustments
            $consumption = $stockA + $purchases - $stockB - $adjustments;

            if (!isset($productConsumption[$productId])) {
                $productConsumption[$productId] = [
                    'product_id' => $productId,
                    'total_consumption' => 0,
                    'total_days' => 0,
                    'periods' => []
                ];
            }

            $productConsumption[$productId]['total_consumption'] += max(0, $consumption);
            $productConsumption[$productId]['total_days'] += $daysBetween;
            $productConsumption[$productId]['periods'][] = [
                'period_start' => $snapshotA['date'],
                'period_end' => $snapshotB['date'],
                'days' => $daysBetween,
                'stock_a' => $stockA,
                'stock_b' => $stockB,
                'purchases' => $purchases,
                'adjustments' => $adjustments,
                'consumption' => max(0, $consumption)
            ];

            $periods[] = [
                'product_id' => $productId,
                'period_start' => $snapshotA['date'],
                'period_end' => $snapshotB['date'],
                'days' => $daysBetween,
                'consumption' => max(0, $consumption)
            ];
        }
    }

    // Calculate average daily usage and upsert to baselines
    $results = [];

    foreach ($productConsumption as $productId => $data) {
        $avgDailyUsage = $data['total_days'] > 0 ? $data['total_consumption'] / $data['total_days'] : 0;

        $baselineId = generateId();

        $stmt = $db->prepare('
            INSERT INTO consumption_baselines (
                id, store_id, product_id, avg_daily_usage, total_consumption,
                total_days, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                avg_daily_usage = VALUES(avg_daily_usage),
                total_consumption = VALUES(total_consumption),
                total_days = VALUES(total_days),
                updated_at = NOW()
        ');

        $stmt->execute([
            $baselineId,
            $storeId,
            $productId,
            $avgDailyUsage,
            $data['total_consumption'],
            $data['total_days']
        ]);

        $results[] = [
            'product_id' => $productId,
            'avg_daily_usage' => $avgDailyUsage,
            'total_consumption' => $data['total_consumption'],
            'total_days' => $data['total_days'],
            'periods' => $data['periods']
        ];
    }

    jsonResponse([
        'store_id' => $storeId,
        'periods' => $periods,
        'results' => $results
    ], 201);

} else {
    requireMethod(['GET', 'POST']);
}
