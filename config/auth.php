<?php
/**
 * Authentication and session management for Mr Tasty App
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/app.php';

/**
 * Get the session token from cookies
 *
 * @return string|null
 */
function getSessionToken(): ?string {
    return $_COOKIE['mt_token'] ?? null;
}

/**
 * Get current authenticated user
 *
 * @return array|null User data or null if not authenticated
 */
function getCurrentUser(): ?array {
    try {
        $token = getSessionToken();

        if (!$token) {
            return null;
        }

        $db = getDB();
        $stmt = $db->prepare('
            SELECT u.* FROM users u
            JOIN sessions s ON u.id = s.user_id
            WHERE s.token = :token
            AND s.expires_at > NOW()
            AND u.active = 1
            LIMIT 1
        ');

        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch();

        return $user ?: null;
    } catch (Exception $e) {
        error_log("Auth error: " . $e->getMessage());
        return null;
    }
}

/**
 * Require authentication - dies with 401 if not authenticated
 *
 * @return array Current user data
 */
function requireAuth(): array {
    $user = getCurrentUser();

    if (!$user) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    return $user;
}

/**
 * Start a session for a user
 *
 * @param string $userId
 * @param int $lifetime Session lifetime in seconds
 * @return string Session token
 */
function startUserSession(string $userId, int $lifetime = SESSION_LIFETIME): string {
    try {
        $token = bin2hex(random_bytes(64));
        $sessionId = generateId();
        $expiresAt = date('Y-m-d H:i:s', time() + $lifetime);

        $db = getDB();
        $stmt = $db->prepare('
            INSERT INTO sessions (id, user_id, token, expires_at)
            VALUES (:id, :user_id, :token, :expires_at)
        ');

        $stmt->execute([
            ':id' => $sessionId,
            ':user_id' => $userId,
            ':token' => $token,
            ':expires_at' => $expiresAt
        ]);

        // Set secure cookie
        setcookie(
            'mt_token',
            $token,
            [
                'expires' => time() + $lifetime,
                'path' => '/',
                'domain' => '',
                'secure' => SESSION_COOKIE_SECURE,
                'httponly' => SESSION_COOKIE_HTTPONLY,
                'samesite' => SESSION_COOKIE_SAMESITE
            ]
        );

        return $token;
    } catch (Exception $e) {
        error_log("Session creation failed: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Destroy the current user session
 *
 * @return void
 */
function destroyUserSession(): void {
    try {
        $token = getSessionToken();

        if ($token) {
            $db = getDB();
            $stmt = $db->prepare('DELETE FROM sessions WHERE token = :token');
            $stmt->execute([':token' => $token]);
        }

        // Clear cookie
        setcookie('mt_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => SESSION_COOKIE_SECURE,
            'httponly' => SESSION_COOKIE_HTTPONLY,
            'samesite' => SESSION_COOKIE_SAMESITE
        ]);

        unset($_COOKIE['mt_token']);
    } catch (Exception $e) {
        error_log("Session destruction failed: " . $e->getMessage());
    }
}

/**
 * Verify a password against a hash
 *
 * @param string $password
 * @param string $hash
 * @return bool
 */
function verifyPassword(string $password, string $hash): bool {
    return password_verify($password, $hash);
}

/**
 * Hash a password for storage
 *
 * @param string $password
 * @return string Bcrypt hash
 */
function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
}
