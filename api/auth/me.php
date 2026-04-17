<?php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/response.php';
require_once __DIR__ . '/../../config/app.php';

requireMethod('GET');

$user = getCurrentUser();

if (!$user) {
    jsonError('Unauthorized', 401);
}

jsonResponse([
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role']
    ]
]);
