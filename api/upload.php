<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/app.php';

requireAuth();
$user = getCurrentUser();

requireMethod('POST');

if (empty($_FILES['file']) || empty($_POST['type'])) {
    jsonError('File and type are required', 400);
}

$file = $_FILES['file'];
$type = trim($_POST['type']);

if ($file['error'] !== UPLOAD_ERR_OK) {
    jsonError('File upload error', 400);
}

$mimeType = mime_content_type($file['tmp_name']);
if (!in_array($mimeType, ALLOWED_MIME_TYPES, true)) {
    jsonError('Invalid file type', 400);
}

if ($file['size'] > MAX_UPLOAD_SIZE) {
    jsonError('File too large', 413);
}

// Create upload directory if not exists
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// Generate unique filename
$timestamp = time();
$originalName = basename($file['name']);
$filename = $timestamp . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $originalName);
$filepath = UPLOAD_DIR . $filename;

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    jsonError('Failed to save file', 500);
}

$imageUrl = UPLOAD_URL . $filename;

// Call Anthropic API if type is remito or stock
$parsed = ['items' => [], 'confidence' => 0.5];

if ($type === 'remito' || $type === 'stock') {
    $base64Image = base64_encode(file_get_contents($filepath));
    $prompt = $type === 'remito'
        ? 'Extract supplier name, date (YYYY-MM-DD), note number, total (number), currency, and items array with {productName, quantity, unitPrice, subtotal}. Return ONLY valid JSON.'
        : 'Extract product quantities as array with {productName, quantity}. Return ONLY valid JSON.';

    $parsed = callAnthropicVision($base64Image, $mimeType, $prompt);

    if (!is_array($parsed)) {
        $parsed = ['items' => [], 'confidence' => 0.5];
    }
}

// Alias resolution
$db = getDB();

if ($type === 'remito' && isset($parsed['supplierName'])) {
    $supplierName = $parsed['supplierName'];
    $stmt = $db->prepare('
        SELECT s.id, s.name FROM suppliers s
        LEFT JOIN supplier_aliases sa ON sa.supplier_id = s.id
        WHERE s.name = ? OR sa.alias = ?
        LIMIT 1
    ');
    $stmt->execute([$supplierName, $supplierName]);
    $supplierResult = $stmt->fetch();

    if ($supplierResult) {
        $parsed['resolvedSupplierId'] = $supplierResult['id'];
        $parsed['resolvedSupplierName'] = $supplierResult['name'];
    } else {
        $parsed['resolvedSupplierId'] = null;
        $parsed['resolvedSupplierName'] = null;
    }
}

if (isset($parsed['items']) && is_array($parsed['items'])) {
    foreach ($parsed['items'] as &$item) {
        if (isset($item['productName'])) {
            $stmt = $db->prepare('
                SELECT p.id, p.name FROM products p
                LEFT JOIN product_aliases pa ON pa.product_id = p.id
                WHERE p.name = ? OR pa.alias = ?
                LIMIT 1
            ');
            $stmt->execute([$item['productName'], $item['productName']]);
            $productResult = $stmt->fetch();

            if ($productResult) {
                $item['resolvedProductId'] = $productResult['id'];
            } else {
                $item['resolvedProductId'] = null;
            }
        }
    }
}

jsonResponse([
    'type' => $type,
    'imageUrl' => $imageUrl,
    'parsed' => $parsed
]);

function callAnthropicVision(string $base64Image, string $mimeType, string $prompt): array {
    $apiKey = ANTHROPIC_API_KEY;

    if (!$apiKey) {
        return ['mock' => true, 'items' => [], 'confidence' => 0.5];
    }

    $payload = [
        'model' => ANTHROPIC_MODEL,
        'max_tokens' => 1024,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $mimeType, 'data' => $base64Image]],
                ['type' => 'text', 'text' => $prompt]
            ]
        ]]
    ];

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ],
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log('Anthropic API error: ' . $response);
        return ['items' => [], 'confidence' => 0.5];
    }

    $data = json_decode($response, true);

    if (!isset($data['content'][0]['text'])) {
        return ['items' => [], 'confidence' => 0.5];
    }

    $text = $data['content'][0]['text'];

    // Extract JSON from response
    if (preg_match('/\{[\s\S]*\}/m', $text, $matches)) {
        $parsed = json_decode($matches[0], true);
        return is_array($parsed) ? $parsed : ['items' => [], 'confidence' => 0.5];
    }

    return ['items' => [], 'confidence' => 0.5];
}
