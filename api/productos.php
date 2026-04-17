<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$user = getCurrentUser();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $supplierId = $_GET['supplierId'] ?? null;

    $db = getDB();

    $query = 'SELECT p.id, p.name, p.unit, p.pack_size, p.safety_stock, p.rounding_unit, p.active FROM products p';
    $params = [];

    if ($supplierId) {
        $query .= ' JOIN supplier_products sp ON p.id = sp.product_id WHERE sp.supplier_id = ? AND p.active = 1';
        $params[] = $supplierId;
    } else {
        $query .= ' WHERE p.active = 1';
    }

    $query .= ' ORDER BY p.name ASC';

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    $result = [];
    foreach ($products as $product) {
        // Get aliases
        $aliasStmt = $db->prepare('SELECT id, alias FROM product_aliases WHERE product_id = ? ORDER BY alias ASC');
        $aliasStmt->execute([$product['id']]);
        $aliases = $aliasStmt->fetchAll();

        // Get suppliers for this product
        $supplierStmt = $db->prepare('
            SELECT s.id, s.name FROM suppliers s
            JOIN supplier_products sp ON s.id = sp.supplier_id
            WHERE sp.product_id = ? AND s.active = 1
            ORDER BY s.name ASC
        ');
        $supplierStmt->execute([$product['id']]);
        $suppliers = $supplierStmt->fetchAll();

        $result[] = [
            'id' => $product['id'],
            'name' => $product['name'],
            'unit' => $product['unit'],
            'pack_size' => $product['pack_size'],
            'safety_stock' => $product['safety_stock'],
            'rounding_unit' => $product['rounding_unit'],
            'active' => (bool)$product['active'],
            'aliases' => $aliases,
            'suppliers' => $suppliers
        ];
    }

    jsonResponse(['data' => $result]);
}
elseif ($method === 'POST') {
    $body = getRequestBody();

    if (empty($body['name'])) {
        jsonError('Name is required', 400);
    }

    $productId = generateId();
    $name = trim($body['name']);
    $unit = isset($body['unit']) ? trim($body['unit']) : null;
    $packSize = isset($body['packSize']) ? (int)$body['packSize'] : null;
    $safetyStock = isset($body['safetyStock']) ? (int)$body['safetyStock'] : 0;
    $roundingUnit = isset($body['roundingUnit']) ? (int)$body['roundingUnit'] : 1;
    $aliases = isset($body['aliases']) && is_array($body['aliases']) ? $body['aliases'] : [];
    $supplierId = isset($body['supplierId']) ? trim($body['supplierId']) : null;

    $db = getDB();

    // Insert product
    $stmt = $db->prepare('INSERT INTO products (id, name, unit, pack_size, safety_stock, rounding_unit, active) VALUES (?, ?, ?, ?, ?, ?, 1)');
    $stmt->execute([$productId, $name, $unit, $packSize, $safetyStock, $roundingUnit]);

    // Insert aliases
    if (!empty($aliases)) {
        $aliasStmt = $db->prepare('INSERT INTO product_aliases (id, product_id, alias) VALUES (?, ?, ?)');
        foreach ($aliases as $alias) {
            $aliasId = generateId();
            $aliasStmt->execute([$aliasId, $productId, trim($alias)]);
        }
    }

    // Link to supplier if provided
    if ($supplierId) {
        $linkStmt = $db->prepare('INSERT INTO supplier_products (id, supplier_id, product_id) VALUES (?, ?, ?)');
        $linkId = generateId();
        $linkStmt->execute([$linkId, $supplierId, $productId]);
    }

    $aliasesResult = array_map(fn($a) => ['id' => generateId(), 'alias' => $a], $aliases);
    $suppliersResult = $supplierId ? [['id' => $supplierId, 'name' => '']] : [];

    jsonResponse([
        'id' => $productId,
        'name' => $name,
        'unit' => $unit,
        'pack_size' => $packSize,
        'safety_stock' => $safetyStock,
        'rounding_unit' => $roundingUnit,
        'active' => true,
        'aliases' => $aliasesResult,
        'suppliers' => $suppliersResult
    ], 201);
}
elseif ($method === 'PUT') {
    $body = getRequestBody();

    if (empty($body['id']) || empty($body['name'])) {
        jsonError('ID and name are required', 400);
    }

    $productId = trim($body['id']);
    $name = trim($body['name']);
    $unit = isset($body['unit']) ? trim($body['unit']) : null;
    $packSize = isset($body['packSize']) ? (int)$body['packSize'] : null;
    $safetyStock = isset($body['safetyStock']) ? (int)$body['safetyStock'] : 0;
    $roundingUnit = isset($body['roundingUnit']) ? (int)$body['roundingUnit'] : 1;
    $aliases = isset($body['aliases']) && is_array($body['aliases']) ? $body['aliases'] : [];

    $db = getDB();

    // Update product
    $stmt = $db->prepare('UPDATE products SET name = ?, unit = ?, pack_size = ?, safety_stock = ?, rounding_unit = ? WHERE id = ?');
    $stmt->execute([$name, $unit, $packSize, $safetyStock, $roundingUnit, $productId]);

    // Update aliases
    if (isset($body['aliases'])) {
        $db->prepare('DELETE FROM product_aliases WHERE product_id = ?')->execute([$productId]);
        if (!empty($aliases)) {
            $aliasStmt = $db->prepare('INSERT INTO product_aliases (id, product_id, alias) VALUES (?, ?, ?)');
            foreach ($aliases as $alias) {
                $aliasId = generateId();
                $aliasStmt->execute([$aliasId, $productId, trim($alias)]);
            }
        }
    }

    // Fetch updated data
    $stmt = $db->prepare('SELECT id, name, unit, pack_size, safety_stock, rounding_unit, active FROM products WHERE id = ?');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();

    $aliasStmt = $db->prepare('SELECT id, alias FROM product_aliases WHERE product_id = ? ORDER BY alias ASC');
    $aliasStmt->execute([$productId]);
    $aliasesResult = $aliasStmt->fetchAll();

    $supplierStmt = $db->prepare('
        SELECT s.id, s.name FROM suppliers s
        JOIN supplier_products sp ON s.id = sp.supplier_id
        WHERE sp.product_id = ? AND s.active = 1
        ORDER BY s.name ASC
    ');
    $supplierStmt->execute([$productId]);
    $suppliersResult = $supplierStmt->fetchAll();

    jsonResponse([
        'id' => $product['id'],
        'name' => $product['name'],
        'unit' => $product['unit'],
        'pack_size' => $product['pack_size'],
        'safety_stock' => $product['safety_stock'],
        'rounding_unit' => $product['rounding_unit'],
        'active' => (bool)$product['active'],
        'aliases' => $aliasesResult,
        'suppliers' => $suppliersResult
    ]);
}
else {
    jsonError('Method not allowed', 405);
}
