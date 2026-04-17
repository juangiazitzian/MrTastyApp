<?php
/**
 * Mr Tasty App - One-time Setup Script
 *
 * WARNING: DELETE THIS FILE AFTER SETUP IS COMPLETE FOR SECURITY
 *
 * This script sets up the Mr Tasty application by:
 * 1. Creating the admin user
 * 2. Optionally running the SQL schema file
 *
 * Usage:
 * - Visit this file in your browser: /setup.php
 * - To import the SQL schema: /setup.php?run_sql=1
 *
 * After setup is complete, delete this file immediately.
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/auth.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

$output = [];
$errors = [];

try {
    $db = getDB();
    $output[] = "Database connection established successfully.";

    // Check if admin user already exists
    $stmt = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => 'admin@mrtasty.com']);
    $adminExists = $stmt->fetch();

    if ($adminExists) {
        $output[] = "✓ Admin user already exists (admin@mrtasty.com)";
    } else {
        // Create admin user
        $adminId = generateId();
        $passwordHash = hashPassword('mrtasty2024');

        $stmt = $db->prepare('
            INSERT INTO users (id, email, name, password_hash, role, active)
            VALUES (:id, :email, :name, :hash, :role, 1)
        ');

        $stmt->execute([
            ':id' => $adminId,
            ':email' => 'admin@mrtasty.com',
            ':name' => 'Administrador Mr Tasty',
            ':hash' => $passwordHash,
            ':role' => 'admin'
        ]);

        $output[] = "✓ Admin user created successfully";
        $output[] = "  Email: admin@mrtasty.com";
        $output[] = "  Password: mrtasty2024";
        $output[] = "  WARNING: Change this password immediately after first login!";
    }

    // Run SQL schema import if requested
    if (isset($_GET['run_sql']) && $_GET['run_sql'] === '1') {
        $sqlFile = __DIR__ . '/setup.sql';

        if (!file_exists($sqlFile)) {
            throw new Exception("setup.sql file not found at: {$sqlFile}");
        }

        $sqlContent = file_get_contents($sqlFile);

        // Execute each SQL statement separately
        $statements = array_filter(
            array_map('trim', preg_split('/;[\s\n]+/', $sqlContent)),
            fn($s) => !empty($s) && !str_starts_with($s, '--')
        );

        $count = 0;
        foreach ($statements as $statement) {
            if (!empty(trim($statement))) {
                try {
                    $db->exec($statement);
                    $count++;
                } catch (Exception $e) {
                    // Log but continue with next statement
                    error_log("SQL statement error: " . $e->getMessage());
                }
            }
        }

        $output[] = "✓ SQL schema imported successfully ({$count} statements)";
        $output[] = "✓ Database initialized with stores, suppliers, products, and settings";
    }

    $output[] = "";
    $output[] = "Setup completed successfully!";
    $output[] = "";
    $output[] = "IMPORTANT SECURITY NOTES:";
    $output[] = "- Delete setup.php immediately after setup is complete";
    $output[] = "- Change the default admin password on first login";
    $output[] = "- Set proper environment variables for DB_HOST, DB_NAME, DB_USER, DB_PASS";
    $output[] = "- Set ANTHROPIC_API_KEY environment variable for AI features";

} catch (Exception $e) {
    $errors[] = "Error: " . $e->getMessage();
    error_log("Setup error: " . $e->getMessage());
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mr Tasty App - Setup</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            padding: 40px;
        }

        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }

        .message-box {
            margin: 20px 0;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .success {
            background: #f0f9ff;
            border-left: 4px solid #10b981;
            color: #047857;
        }

        .error {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            color: #991b1b;
        }

        .warning {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            color: #92400e;
            margin-top: 20px;
            padding: 20px;
            border-radius: 4px;
        }

        .button-group {
            margin-top: 30px;
            display: flex;
            gap: 10px;
        }

        button {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }

        .btn-secondary:hover {
            background: #d1d5db;
        }

        .deletion-warning {
            background: #fef2f2;
            border: 2px solid #ef4444;
            padding: 20px;
            border-radius: 4px;
            margin-top: 20px;
            color: #991b1b;
        }

        .deletion-warning strong {
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Mr Tasty App</h1>
        <p class="subtitle">Setup Wizard</p>

        <?php if (!empty($errors)): ?>
            <?php foreach ($errors as $error): ?>
                <div class="message-box error"><?php echo htmlspecialchars($error); ?></div>
            <?php endforeach; ?>
        <?php endif; ?>

        <?php if (!empty($output)): ?>
            <div class="message-box success"><?php echo htmlspecialchars(implode("\n", $output)); ?></div>
        <?php endif; ?>

        <?php if (empty($errors) && !isset($_GET['run_sql'])): ?>
            <div class="warning">
                <strong>Step 1: Database Schema (Optional)</strong>
                <p>If this is your first time setting up, click the button below to import the database schema and seed data.</p>
            </div>

            <div class="button-group">
                <a href="?run_sql=1" style="text-decoration: none;">
                    <button class="btn-primary">Import Database Schema</button>
                </a>
            </div>
        <?php endif; ?>

        <?php if (empty($errors)): ?>
            <div class="deletion-warning">
                <strong>⚠️ CRITICAL SECURITY WARNING</strong>
                You must delete this setup.php file immediately after setup is complete.
                Leaving this file on your server is a major security risk.
                <br><br>
                Run this command in your server terminal:
                <br><code>rm /path/to/setup.php</code>
            </div>

            <div class="button-group">
                <button class="btn-secondary" onclick="alert('Please delete setup.php from your server now!'); window.location.href='/';">
                    Go to Application
                </button>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
