<?php
/**
 * Delivery Notes Trend API
 * GET only - provides monthly trend data for delivery notes
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireMethod('GET');
requireAuth();
$db = getDB();

$months = (int)(getQueryParam('months') ?? 12);
$storeId = getQueryParam('storeId');

// Calculate start date (first day of month N months ago)
$startDate = date('Y-m-01', strtotime("-" . ($months - 1) . " months"));
$endDate = date('Y-m-t');

// Spanish month names
$monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Fetch delivery notes in date range
$query = '
    SELECT DATE_FORMAT(dn.date, "%Y-%m") as month_key, SUM(dn.total) as total
    FROM delivery_notes dn
    WHERE dn.date >= ? AND dn.date <= ?
';

$params = [$startDate, $endDate];

if ($storeId) {
    $query .= ' AND dn.store_id = ?';
    $params[] = $storeId;
}

$query .= ' GROUP BY DATE_FORMAT(dn.date, "%Y-%m") ORDER BY month_key ASC';

$stmt = $db->prepare($query);
$stmt->execute($params);
$results = $stmt->fetchAll();

// Build result array with all months (including empty ones)
$trend = [];
$dataByMonth = [];

foreach ($results as $row) {
    $dataByMonth[$row['month_key']] = (float)$row['total'];
}

// Generate all months in range
$current = new DateTime($startDate);
$end = new DateTime($endDate);

while ($current <= $end) {
    $key = $current->format('Y-m');
    $monthNum = (int)$current->format('m');
    $yearNum = (int)$current->format('Y');
    $shortYear = substr($current->format('Y'), 2);

    $label = $monthNames[$monthNum - 1] . ' ' . $shortYear;
    $value = $dataByMonth[$key] ?? 0;

    $trend[] = [
        'key' => $key,
        'label' => $label,
        'value' => $value
    ];

    $current->modify('+1 month');
}

jsonResponse(['trend' => $trend]);
