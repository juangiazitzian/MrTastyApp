<?php
/**
 * Application configuration for Mr Tasty App
 */

// Application constants
define('APP_NAME', 'Mr Tasty');
define('APP_VERSION', '1.0.0');
define('APP_LANG', 'es');
define('APP_CURRENCY', 'ARS');

// Session configuration
define('SESSION_NAME', 'mrtasty_session');
define('SESSION_LIFETIME', 86400 * 30); // 30 days in seconds
define('SESSION_COOKIE_SECURE', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on'); // Auto-detect HTTPS
define('SESSION_COOKIE_HTTPONLY', true);
define('SESSION_COOKIE_SAMESITE', 'Lax');

// File upload configuration
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', '/uploads/');
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
]);

// API configuration
define('ANTHROPIC_API_KEY', getenv('ANTHROPIC_API_KEY') ?: '');
define('ANTHROPIC_MODEL', getenv('ANTHROPIC_MODEL') ?: 'claude-opus-4-5');

// Ensure uploads directory exists
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

/**
 * Generate a UUID v4 identifier
 *
 * @return string UUID v4 format
 */
function generateId(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Get current date in app format (YYYY-MM-DD)
 *
 * @return string
 */
function getCurrentDate(): string {
    return date('Y-m-d');
}

/**
 * Get current datetime in app format (YYYY-MM-DD HH:mm:ss)
 *
 * @return string
 */
function getCurrentDateTime(): string {
    return date('Y-m-d H:i:s');
}

/**
 * Format a number as currency (ARS)
 *
 * @param float $amount
 * @return string Formatted amount with ARS symbol
 */
function formatCurrency(float $amount): string {
    return '$' . number_format($amount, 2, ',', '.');
}
