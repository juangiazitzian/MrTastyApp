<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$user = getCurrentUser();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $category = $_GET['category'] ?? null;

    $db = getDB();

    $query = 'SELECT s.id, s.name, s.category, s.eerr_label, s.is_blancaluna, s.active FROM suppliers s WHERE s.active = 1';
    $params = [];

    if ($category) {
        $query .= ' AND s.category = ?';
        $params[] = $category;
    }

    $query .= ' ORDER BY s.name ASC';

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $suppliers = $stmt->fetchAll();

    $result = [];
    foreach ($suppliers as $supplier) {
        // Get aliases
        $aliasStmt = $db->prepare('SELECT id, alias FROM supplier_aliases WHERE supplier_id = ? ORDER BY alias ASC');
        $aliasStmt->execute([$supplier['id']]);
        $aliases = $aliasStmt->fetchAll();

        // Get eerr mappings
        $eerrStmt = $db->prepare('SELECT id, eerr_category, eerr_section FROM eerr_mappings WHERE supplier_id = ? ORDER BY eerr_category ASC');
        $eerrStmt->execute([$supplier['id']]);
        $eerrMappings = $eerrStmt->fetchAll();

        // Get delivery notes count
        $countStmt = $db->prepare('SELECT COUNT(*) as cnt FROM delivery_notes WHERE supplier_id = ?');
        $countStmt->execute([$supplier['id']]);
        $countRow = $countStmt->fetch();

        $result[] = [
            'id' => $supplier['id'],
            'name' => $supplier['name'],
            'category' => $supplier['category'],
            'eerr_label' => $supplier['eerr_label'],
            'is_blancaluna' => (bool)$supplier['is_blancaluna'],
            'active' => (bool)$supplier['active'],
            'aliases' => $aliases,
            'eerr_mappings' => $eerrMappings,
            '_count' => ['delivery_notes' => (int)$countRow['cnt']]
        ];
    }

    jsonResponse(['data' => $result]);
}
elseif ($method === 'POST') {
    $body = getRequestBody();

    if (empty($body['name'])) {
        jsonError('Name is required', 400);
    }

    $supplierId = generateId();
    $name = trim($body['name']);
    $category = isset($body['category']) ? trim($body['category']) : 'MERCADERIA';
    $eerrLabel = isset($body['eerrLabel']) ? trim($body['eerrLabel']) : null;
    $isBlancaluna = isset($body['isBlancaluna']) ? (bool)$body['isBlancaluna'] : false;
    $aliases = isset($body['aliases']) && is_array($body['aliases']) ? $body['aliases'] : [];
    $eerrCategory = isset($body['eerrCategory']) ? trim($body['eerrCategory']) : null;
    $eerrSection = isset($body['eerrSection']) ? trim($body['eerrSection']) : null;

    $db = getDB();

    // Insert supplier
    $stmt = $db->prepare('INSERT INTO suppliers (id, name, category, eerr_label, is_blancaluna, active) VALUES (?, ?, ?, ?, ?, 1)');
    $stmt->execute([$supplierId, $name, $category, $eerrLabel, $isBlancaluna ? 1 : 0]);

    // Insert aliases
    if (!empty($aliases)) {
        $aliasStmt = $db->prepare('INSERT INTO supplier_aliases (id, supplier_id, alias) VALUES (?, ?, ?)');
        foreach ($aliases as $alias) {
            $aliasId = generateId();
            $aliasStmt->execute([$aliasId, $supplierId, trim($alias)]);
        }
    }

    // Insert eerr mapping
    if ($eerrCategory) {
        $mappingId = generateId();
        $mappingStmt = $db->prepare('INSERT INTO eerr_mappings (id, supplier_id, eerr_category, eerr_section) VALUES (?, ?, ?, ?)');
        $mappingStmt->execute([$mappingId, $supplierId, $eerrCategory, $eerrSection]);
    }

    jsonResponse([
        'id' => $supplierId,
        'name' => $name,
        'category' => $category,
        'eerr_label' => $eerrLabel,
        'is_blancaluna' => $isBlancaluna,
        'active' => true,
        'aliases' => array_map(fn($a) => ['id' => generateId(), 'alias' => $a], $aliases),
        'eerr_mappings' => $eerrCategory ? [['id' => generateId(), 'eerr_category' => $eerrCategory, 'eerr_section' => $eerrSection]] : [],
        '_count' => ['delivery_notes' => 0]
    ], 201);
}
elseif ($method === 'PUT') {
    $body = getRequestBody();

    if (empty($body['id']) || empty($body['name'])) {
        jsonError('ID and name are required', 400);
    }

    $supplierId = trim($body['id']);
    $name = trim($body['name']);
    $category = isset($body['category']) ? trim($body['category']) : 'MERCADERIA';
    $eerrLabel = isset($body['eerrLabel']) ? trim($body['eerrLabel']) : null;
    $isBlancaluna = isset($body['isBlancaluna']) ? (bool)$body['isBlancaluna'] : false;
    $aliases = isset($body['aliases']) && is_array($body['aliases']) ? $body['aliases'] : [];
    $eerrCategory = isset($body['eerrCategory']) ? trim($body['eerrCategory']) : null;
    $eerrSection = isset($body['eerrSection']) ? trim($body['eerrSection']) : null;

    $db = getDB();

    // Update supplier
    $stmt = $db->prepare('UPDATE suppliers SET name = ?, category = ?, eerr_label = ?, is_blancaluna = ? WHERE id = ?');
    $stmt->execute([$name, $category, $eerrLabel, $isBlancaluna ? 1 : 0, $supplierId]);

    // Update aliases (delete old, insert new)
    if (isset($body['aliases'])) {
        $db->prepare('DELETE FROM supplier_aliases WHERE supplier_id = ?')->execute([$supplierId]);
        if (!empty($aliases)) {
            $aliasStmt = $db->prepare('INSERT INTO supplier_aliases (id, supplier_id, alias) VALUES (?, ?, ?)');
            foreach ($aliases as $alias) {
                $aliasId = generateId();
                $aliasStmt->execute([$aliasId, $supplierId, trim($alias)]);
            }
        }
    }

    // Upsert eerr mapping
    if ($eerrCategory) {
        $db->prepare('DELETE FROM eerr_mappings WHERE supplier_id = ?')->execute([$supplierId]);
        $mappingId = generateId();
        $mappingStmt = $db->prepare('INSERT INTO eerr_mappings (id, supplier_id, eerr_category, eerr_section) VALUES (?, ?, ?, ?)');
        $mappingStmt->execute([$mappingId, $supplierId, $eerrCategory, $eerrSection]);
    }

    // Fetch updated data
    $stmt = $db->prepare('SELECT id, name, category, eerr_label, is_blancaluna, active FROM suppliers WHERE id = ?');
    $stmt->execute([$supplierId]);
    $supplier = $stmt->fetch();

    $aliasStmt = $db->prepare('SELECT id, alias FROM supplier_aliases WHERE supplier_id = ? ORDER BY alias ASC');
    $aliasStmt->execute([$supplierId]);
    $aliasesResult = $aliasStmt->fetchAll();

    $eerrStmt = $db->prepare('SELECT id, eerr_category, eerr_section FROM eerr_mappings WHERE supplier_id = ? ORDER BY eerr_category ASC');
    $eerrStmt->execute([$supplierId]);
    $eerrMappingsResult = $eerrStmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) as cnt FROM delivery_notes WHERE supplier_id = ?');
    $countStmt->execute([$supplierId]);
    $countRow = $countStmt->fetch();

    jsonResponse([
        'id' => $supplier['id'],
        'name' => $supplier['name'],
        'category' => $supplier['category'],
        'eerr_label' => $supplier['eerr_label'],
        'is_blancaluna' => (bool)$supplier['is_blancaluna'],
        'active' => (bool)$supplier['active'],
        'aliases' => $aliasesResult,
        'eerr_mappings' => $eerrMappingsResult,
        '_count' => ['delivery_notes' => (int)$countRow['cnt']]
    ]);
}
else {
    jsonError('Method not allowed', 405);
}
