<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$user = getCurrentUser();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (isset($_GET['key'])) {
        $key = trim($_GET['key']);

        $db = getDB();
        $stmt = $db->prepare('SELECT id, key, value, label FROM app_settings WHERE key = ?');
        $stmt->execute([$key]);
        $setting = $stmt->fetch();

        if (!$setting) {
            jsonError('Setting not found', 404);
        }

        $value = json_decode($setting['value'], true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $value = $setting['value'];
        }

        jsonResponse([
            'id' => $setting['id'],
            'key' => $setting['key'],
            'value' => $value,
            'label' => $setting['label']
        ]);
    } else {
        $db = getDB();
        $stmt = $db->prepare('SELECT id, key, value, label FROM app_settings ORDER BY key ASC');
        $stmt->execute();
        $settings = $stmt->fetchAll();

        $result = [];
        foreach ($settings as $setting) {
            $value = json_decode($setting['value'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $value = $setting['value'];
            }

            $result[] = [
                'id' => $setting['id'],
                'key' => $setting['key'],
                'value' => $value,
                'label' => $setting['label']
            ];
        }

        jsonResponse(['data' => $result]);
    }
}
elseif ($method === 'PUT') {
    $body = getRequestBody();

    if (empty($body['key'])) {
        jsonError('Key is required', 400);
    }

    $key = trim($body['key']);
    $value = json_encode($body['value']);
    $label = isset($body['label']) ? trim($body['label']) : null;
    $id = generateId();

    $db = getDB();

    $stmt = $db->prepare('
        INSERT INTO app_settings (id, key, value, label, updated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            value = VALUES(value),
            label = COALESCE(VALUES(label), label),
            updated_at = NOW()
    ');
    $stmt->execute([$id, $key, $value, $label]);

    $decodedValue = json_decode($value, true);

    jsonResponse([
        'id' => $id,
        'key' => $key,
        'value' => $decodedValue,
        'label' => $label
    ]);
}
else {
    jsonError('Method not allowed', 405);
}
