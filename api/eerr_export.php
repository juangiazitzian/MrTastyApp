<?php
/**
 * EERR Export API
 * GET only - exports EERR data in CSV or JSON format
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
$format = getQueryParam('format', 'json');

if (!$month || !$year) {
    jsonError('Month and year parameters required', 400);
}

// Calculate date range
$firstDay = date('Y-m-01', mktime(0, 0, 0, $month, 1, $year));
$lastDay = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));

// Fetch remitos grouped by eerr category
$remitosQuery = '
    SELECT SUM(dn.total) as total, sup.eerr_label, sup.name as supplier_name
    FROM delivery_notes dn
    LEFT JOIN suppliers sup ON sup.id = dn.supplier_id
    WHERE dn.date >= ? AND dn.date <= ?
';

$remitosParams = [$firstDay, $lastDay];

if ($storeId) {
    $remitosQuery .= ' AND dn.store_id = ?';
    $remitosParams[] = $storeId;
}

$remitosQuery .= ' GROUP BY sup.eerr_label, sup.name ORDER BY sup.eerr_label ASC';

$stmt = $db->prepare($remitosQuery);
$stmt->execute($remitosParams);
$remitosResults = $stmt->fetchAll();

// Fetch eerr_entries for manual amounts
$entriesQuery = '
    SELECT category, SUM(amount) as total
    FROM eerr_entries
    WHERE date >= ? AND date <= ?
';

$entriesParams = [$firstDay, $lastDay];

if ($storeId) {
    $entriesQuery .= ' AND store_id = ?';
    $entriesParams[] = $storeId;
}

$entriesQuery .= ' GROUP BY category ORDER BY category ASC';

$stmt = $db->prepare($entriesQuery);
$stmt->execute($entriesParams);
$entriesResults = $stmt->fetchAll();

// Build eerr data
$eerrData = [];
foreach ($remitosResults as $row) {
    $category = $row['eerr_label'] ?? $row['supplier_name'] ?? 'Sin categoría';
    $eerrData[] = [
        'category' => $category,
        'amount' => (float)$row['total'],
        'type' => 'remito'
    ];
}

foreach ($entriesResults as $row) {
    $eerrData[] = [
        'category' => $row['category'],
        'amount' => (float)$row['total'],
        'type' => 'manual'
    ];
}

// Build detail array with all items
$detalle = [];
foreach ($eerrData as $item) {
    $detalle[] = [
        'category' => $item['category'],
        'amount' => $item['amount'],
        'type' => $item['type']
    ];
}

if ($format === 'csv') {
    // Generate CSV
    $csv = "Categoría,Monto,Tipo\n";

    foreach ($detalle as $item) {
        $csv .= '"' . str_replace('"', '""', $item['category']) . '",';
        $csv .= number_format($item['amount'], 2, ',', '.') . ',';
        $csv .= $item['type'] . "\n";
    }

    // Send CSV response
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="EERR_' . $month . '_' . $year . '.csv"');
    echo "\xEF\xBB\xBF"; // UTF-8 BOM
    echo $csv;
    exit;
} else {
    // JSON response
    jsonResponse([
        'month' => (int)$month,
        'year' => (int)$year,
        'eerr_data' => $eerrData,
        'detalle' => $detalle
    ]);
}
