<?php
/**
 * EERR (Estado de Resultado) API
 * Handles GET (fetch EERR data with aggregations) and PUT (update mappings/entries)
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$db = getDB();

// EERR template definition
$EERR_TEMPLATE = [
    [
        'name' => 'VENTAS',
        'kind' => 'income',
        'items' => [
            ['category' => 'Ventas San Miguel Balbn', 'source' => 'manual'],
            ['category' => 'Ventas San Miguel Peron', 'source' => 'manual'],
        ]
    ],
    [
        'name' => 'MERCADERIA',
        'kind' => 'expense',
        'items' => [
            ['category' => 'Verduleria', 'source' => 'remitos'],
            ['category' => 'Huevos', 'source' => 'remitos'],
            ['category' => 'Aceite', 'source' => 'remitos'],
            ['category' => 'CDP', 'source' => 'remitos'],
            ['category' => 'The Bread Box', 'source' => 'remitos'],
            ['category' => 'Coca Cola', 'source' => 'remitos'],
            ['category' => 'Blanca Luna', 'source' => 'remitos'],
            ['category' => 'TODO ENVASES', 'source' => 'remitos'],
            ['category' => 'Papelería', 'source' => 'remitos'],
        ]
    ],
    [
        'name' => 'SUELDOS',
        'kind' => 'expense',
        'items' => [
            ['category' => 'Sueldos y jornales', 'source' => 'manual'],
            ['category' => 'Cargas sociales', 'source' => 'manual'],
        ]
    ],
    [
        'name' => 'GASTOS DE LOCAL',
        'kind' => 'expense',
        'items' => [
            ['category' => 'Alquiler', 'source' => 'manual'],
            ['category' => 'Servicios', 'source' => 'manual'],
            ['category' => 'Limpieza', 'source' => 'manual'],
        ]
    ],
    [
        'name' => 'IMPUESTOS, GASTOS BANCARIOS Y COMISIONES',
        'kind' => 'expense',
        'items' => [
            ['category' => 'Impuestos', 'source' => 'manual'],
            ['category' => 'Gastos bancarios', 'source' => 'manual'],
            ['category' => 'Comisiones plataformas', 'source' => 'manual'],
        ]
    ],
    [
        'name' => 'GASTOS DE MANTENIMIENTO',
        'kind' => 'expense',
        'items' => [
            ['category' => 'Reparaciones', 'source' => 'manual'],
            ['category' => 'Equipamiento', 'source' => 'manual'],
        ]
    ],
];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = getQueryParam('action');

    if ($action === 'mappings') {
        // Return all eerr_mappings with supplier info
        $stmt = $db->prepare('
            SELECT em.*, s.name as supplier_name
            FROM eerr_mappings em
            LEFT JOIN suppliers s ON s.id = em.supplier_id
            ORDER BY s.name ASC
        ');
        $stmt->execute();
        $mappings = $stmt->fetchAll();

        jsonResponse(['mappings' => $mappings]);
    } else {
        // Standard EERR report for period
        $month = getQueryParam('month');
        $year = getQueryParam('year');
        $storeId = getQueryParam('storeId');

        if (!$month || !$year) {
            jsonError('Month and year parameters required', 400);
        }

        // Calculate date range
        $firstDay = date('Y-m-01', mktime(0, 0, 0, $month, 1, $year));
        $lastDay = date('Y-m-t', mktime(0, 0, 0, $month, 1, $year));

        // Build rows map
        $rowsMap = [];
        foreach ($EERR_TEMPLATE as $section) {
            foreach ($section['items'] as $item) {
                $category = $item['category'];
                $rowsMap[$category] = [
                    'category' => $category,
                    'source' => $item['source'],
                    'section' => $section['name'],
                    'kind' => $section['kind'],
                    'total' => 0
                ];
            }
        }

        // Fetch delivery notes grouped by supplier eerr_category
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

        $remitosQuery .= ' GROUP BY sup.eerr_label, sup.name';

        $stmt = $db->prepare($remitosQuery);
        $stmt->execute($remitosParams);
        $remitosResults = $stmt->fetchAll();

        // Add remitos to rows
        foreach ($remitosResults as $row) {
            $category = $row['eerr_label'] ?? $row['supplier_name'] ?? 'Sin categoría';
            if (isset($rowsMap[$category])) {
                $rowsMap[$category]['total'] += (float)$row['total'];
            }
        }

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

        $entriesQuery .= ' GROUP BY category';

        $stmt = $db->prepare($entriesQuery);
        $stmt->execute($entriesParams);
        $entriesResults = $stmt->fetchAll();

        // Add manual entries to rows
        foreach ($entriesResults as $row) {
            $category = $row['category'];
            if (isset($rowsMap[$category])) {
                $rowsMap[$category]['total'] += (float)$row['total'];
            }
        }

        // Build sections array
        $sections = [];
        $salesTotal = 0;
        $expenseTotal = 0;

        foreach ($EERR_TEMPLATE as $section) {
            $sectionTotal = 0;
            $items = [];

            foreach ($section['items'] as $item) {
                $category = $item['category'];
                $rowData = $rowsMap[$category];
                $sectionTotal += $rowData['total'];
                $items[] = [
                    'category' => $category,
                    'total' => $rowData['total']
                ];
            }

            $sections[] = [
                'section' => $section['name'],
                'kind' => $section['kind'],
                'total' => $sectionTotal,
                'items' => $items
            ];

            if ($section['kind'] === 'income') {
                $salesTotal += $sectionTotal;
            } else {
                $expenseTotal += $sectionTotal;
            }
        }

        $profit = $salesTotal - $expenseTotal;
        $profitPercentage = $salesTotal > 0 ? ($profit / $salesTotal) * 100 : 0;

        jsonResponse([
            'month' => (int)$month,
            'year' => (int)$year,
            'sections' => $sections,
            'sales_total' => $salesTotal,
            'expense_total' => $expenseTotal,
            'profit' => $profit,
            'profit_percentage' => $profitPercentage
        ]);
    }

} elseif ($method === 'PUT') {
    $body = getRequestBody();

    if (isset($body['action']) && $body['action'] === 'entries' || isset($body['entries'])) {
        // Upsert entries
        $entries = $body['entries'] ?? [$body];

        foreach ($entries as $entry) {
            $entryId = $entry['id'] ?? generateId();

            $stmt = $db->prepare('
                INSERT INTO eerr_entries (
                    id, store_id, category, date, amount, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    amount = VALUES(amount),
                    notes = VALUES(notes),
                    updated_at = NOW()
            ');

            $stmt->execute([
                $entryId,
                $entry['store_id'],
                $entry['category'],
                $entry['date'],
                $entry['amount'],
                $entry['notes'] ?? null
            ]);
        }

        jsonResponse(['ok' => true]);
    } else {
        // Upsert eerr_mappings for supplier
        $supplierId = $body['supplier_id'];
        $eerrCategory = $body['eerr_category'];

        $stmt = $db->prepare('
            INSERT INTO eerr_mappings (supplier_id, eerr_category, created_at, updated_at)
            VALUES (?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                eerr_category = VALUES(eerr_category),
                updated_at = NOW()
        ');

        $stmt->execute([$supplierId, $eerrCategory]);

        jsonResponse(['ok' => true]);
    }

} else {
    requireMethod(['GET', 'PUT']);
}
