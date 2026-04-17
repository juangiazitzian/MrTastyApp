<?php
/**
 * Delivery Notes Summary API
 * GET only - provides aggregated summary of delivery notes by supplier and store
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireMethod('GET');
requireAuth();
$db = getDB();

$month = getQueryParam('month');
$year = getQueryParam('year');
$storeId = getQueryParam('storeId');

if (!$month || !$year) {
    jsonError('Month and year parameters required', 400);
}

// Calculate first and last day of month
$firstDay = date('Y-m-01', mktime(0, 0, 0, $month, 1, $year));
$lastDay = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));

// Fetch delivery notes
$query = '
    SELECT dn.*, s.name as store_name, s.id as store_id,
           sup.name as supplier_name, sup.id as supplier_id_rel, sup.eerr_label
    FROM delivery_notes dn
    JOIN stores s ON s.id = dn.store_id
    LEFT JOIN suppliers sup ON sup.id = dn.supplier_id
    WHERE dn.date >= ? AND dn.date <= ?
';

$params = [$firstDay, $lastDay];

if ($storeId) {
    $query .= ' AND dn.store_id = ?';
    $params[] = $storeId;
}

$stmt = $db->prepare($query);
$stmt->execute($params);
$notes = $stmt->fetchAll();

// Group by supplier
$bySupplier = [];
$byStore = [];
$grandTotal = 0;
$totalRemitos = count($notes);

foreach ($notes as $note) {
    $supplierId = $note['supplier_id_rel'] ?? 'sin-proveedor';
    $storeId = $note['store_id'];

    // Initialize supplier group
    if (!isset($bySupplier[$supplierId])) {
        $bySupplier[$supplierId] = [
            'supplier_id' => $note['supplier_id_rel'],
            'supplier_name' => $note['supplier_name'],
            'eerr_label' => $note['eerr_label'] ?? null,
            'total' => 0,
            'count' => 0,
            'by_store' => []
        ];
    }

    // Initialize store group within supplier
    if (!isset($bySupplier[$supplierId]['by_store'][$storeId])) {
        $bySupplier[$supplierId]['by_store'][$storeId] = [
            'store_name' => $note['store_name'],
            'total' => 0,
            'count' => 0
        ];
    }

    // Add to supplier totals
    $amount = (float)$note['total'];
    $bySupplier[$supplierId]['total'] += $amount;
    $bySupplier[$supplierId]['count']++;
    $bySupplier[$supplierId]['by_store'][$storeId]['total'] += $amount;
    $bySupplier[$supplierId]['by_store'][$storeId]['count']++;

    // Add to store totals
    if (!isset($byStore[$storeId])) {
        $byStore[$storeId] = [
            'store_name' => $note['store_name'],
            'total' => 0,
            'count' => 0
        ];
    }
    $byStore[$storeId]['total'] += $amount;
    $byStore[$storeId]['count']++;

    $grandTotal += $amount;
}

// Convert nested store arrays to indexed arrays
foreach ($bySupplier as $key => $supplier) {
    $bySupplier[$key]['by_store'] = array_values($supplier['by_store']);
}

// Sort suppliers by total descending
usort($bySupplier, function ($a, $b) {
    return $b['total'] <=> $a['total'];
});

// Convert store arrays
$byStoreArray = array_values($byStore);

jsonResponse([
    'month' => (int)$month,
    'year' => (int)$year,
    'grand_total' => $grandTotal,
    'total_remitos' => $totalRemitos,
    'by_supplier' => array_values($bySupplier),
    'by_store' => $byStoreArray
]);
