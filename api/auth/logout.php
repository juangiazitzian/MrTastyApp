<?php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/response.php';
require_once __DIR__ . '/../../config/app.php';

requireMethod('POST');

destroyUserSession();

jsonResponse(['ok' => true]);
