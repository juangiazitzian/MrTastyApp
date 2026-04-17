<?php
/**
 * HTTP response helpers for Mr Tasty App API
 */

/**
 * Send JSON response
 *
 * @param array $data Data to encode as JSON
 * @param int $status HTTP status code
 * @return void
 */
function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send JSON error response
 *
 * @param string $message Error message
 * @param int $status HTTP status code
 * @param array $data Additional data to include
 * @return void
 */
function jsonError(string $message, int $status = 400, array $data = []): void {
    $response = array_merge(['error' => $message], $data);
    jsonResponse($response, $status);
}

/**
 * Get request body as decoded JSON
 *
 * @return array Decoded JSON from php://input
 */
function getRequestBody(): array {
    try {
        $input = file_get_contents('php://input');

        if (empty($input)) {
            return [];
        }

        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            jsonError('Invalid JSON in request body', 400);
        }

        return is_array($data) ? $data : [];
    } catch (Exception $e) {
        jsonError('Failed to parse request body', 400);
    }
}

/**
 * Get query parameter from $_GET
 *
 * @param string $key Parameter key
 * @param mixed $default Default value if not found
 * @return mixed Parameter value or default
 */
function getQueryParam(string $key, mixed $default = null): mixed {
    return $_GET[$key] ?? $default;
}

/**
 * Get POST parameter from $_POST
 *
 * @param string $key Parameter key
 * @param mixed $default Default value if not found
 * @return mixed Parameter value or default
 */
function getPostParam(string $key, mixed $default = null): mixed {
    return $_POST[$key] ?? $default;
}

/**
 * Require specific HTTP method(s)
 *
 * @param string|array $method Single method or array of allowed methods
 * @return void
 */
function requireMethod($method): void {
    $allowedMethods = is_array($method) ? $method : [$method];
    $currentMethod = $_SERVER['REQUEST_METHOD'];

    if (!in_array($currentMethod, $allowedMethods, true)) {
        jsonError(
            'Method not allowed. Expected: ' . implode(', ', $allowedMethods),
            405
        );
    }
}

/**
 * Set CORS headers for API
 *
 * @param string $origin Allowed origin
 * @return void
 */
function setCorsHeaders(string $origin = '*'): void {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 3600');
}

/**
 * Handle CORS preflight requests
 *
 * @return void
 */
function handleCorsPreFlight(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        setCorsHeaders();
        http_response_code(200);
        exit;
    }
}
