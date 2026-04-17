<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$user = getCurrentUser();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $db = getDB();
    $stmt = $db->prepare('SELECT id, name, address, active FROM stores WHERE active = 1 ORDER BY name ASC');
    $stmt->execute();
    $stores = $stmt->fetchAll();

    jsonResponse(['data' => $stores]);
}
elseif ($method === 'POST') {
    $body = getRequestBody();

    if (empty($body['name'])) {
        jsonError('Name is required', 400);
    }

    $id = generateId();
    $name = trim($body['name']);
    $address = isset($body['address']) ? trim($body['address']) : null;

    $db = getDB();
    $stmt = $db->prepare('INSERT INTO stores (id, name, address, active) VALUES (?, ?, ?, 1)');
    $stmt->execute([$id, $name, $address]);

    jsonResponse([
        'id' => $id,
        'name' => $name,
        'address' => $address,
        'active' => true
    ], 201);
}
elseif ($method === 'PUT') {
    $body = getRequestBody();

    if (empty($body['id']) || empty($body['name'])) {
        jsonError('ID and name are required', 400);
    }

    $id = trim($body['id']);
    $name = trim($body['name']);
    $address = isset($body['address']) ? trim($body['address']) : null;

    $db = getDB();
    $stmt = $db->prepare('UPDATE stores SET name = ?, address = ? WHERE id = ?');
    $stmt->execute([$name, $address, $id]);

    jsonResponse([
        'id' => $id,
        'name' => $name,
        'address' => $address,
        'active' => true
    ]);
}
elseif ($method === 'DELETE') {
    if (empty($_GET['id'])) {
        jsonError('ID is required', 400);
    }

    $id = trim($_GET['id']);

    $db = getDB();
    $stmt = $db->prepare('UPDATE stores SET active = 0 WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['ok' => true]);
}
else {
    jsonError('Method not allowed', 405);
}
