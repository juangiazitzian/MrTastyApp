<?php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/response.php';
require_once __DIR__ . '/../../config/app.php';

requireMethod('POST');

$body = getRequestBody();

if (empty($body['email']) || empty($body['password'])) {
    jsonError('Email and password required', 400);
}

$email = trim($body['email']);
$password = $body['password'];

$db = getDB();
$stmt = $db->prepare('SELECT id, email, name, role, password_hash FROM users WHERE email = ? AND active = 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonError('Credenciales inválidas', 401);
}

// Create session
startUserSession($user['id']);

jsonResponse([
    'ok' => true,
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role']
    ]
]);
