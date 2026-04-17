<?php
// Mr Tasty App - Main SPA Shell
// Handles authentication check and serves the HTML shell

session_start();

// Check if user is authenticated via session cookie
$isAuthenticated = isset($_SESSION['user_id']);

// For API requests, let them handle auth in their own files
$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$isApiRequest = strpos($requestPath, '/api/') === 0;

// If API request, don't interfere - let the API endpoint handle it
if ($isApiRequest) {
    http_response_code(404);
    exit;
}

// Always serve the HTML shell - JavaScript will handle auth state
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mr Tasty — Gestión de locales</title>

    <!-- Tailwind CSS via CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Tailwind config -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: { 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea6f10' },
                        gold: { 300: '#fde68a', 400: '#fcd34d', 500: '#fbbf24' },
                    }
                }
            }
        }
    </script>

    <!-- Custom CSS -->
    <link rel="stylesheet" href="/public/css/app.css">
</head>
<body style="background: hsl(20,14%,6%); color: hsl(40,15%,92%);">
    <!-- Login View (overlay) -->
    <div id="login-view" class="hidden fixed inset-0 z-50" style="background: hsl(20,14%,6%);">
        <!-- Login content rendered by login.js -->
    </div>

    <!-- Main App Layout -->
    <div id="app-layout" class="flex min-h-screen" style="background: hsl(20,14%,6%);">
        <!-- Desktop Sidebar -->
        <aside id="sidebar" class="hidden lg:flex fixed top-0 left-0 h-full w-60 flex-col z-30 overflow-y-auto" style="background: hsl(20,14%,5%); border-right: 1px solid hsl(25,8%,14%);">
            <!-- Sidebar content injected by app.js -->
        </aside>

        <!-- Mobile Top Bar -->
        <div id="mobile-topbar" class="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b" style="background: hsl(20,14%,6%); border-color: hsl(25,8%,14%);">
            <div class="font-bold text-orange-400 text-lg flex items-center gap-2">
                <span style="font-size: 18px;">🍔</span>
                <span>Mr Tasty</span>
            </div>
            <button id="menu-toggle" class="p-2 rounded-lg text-white/50 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
        </div>

        <!-- Mobile Sidebar Overlay -->
        <div id="mobile-overlay" class="hidden lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"></div>

        <!-- Mobile Sidebar Panel -->
        <div id="mobile-sidebar" class="lg:hidden fixed top-0 left-0 h-full w-60 z-50 flex flex-col overflow-y-auto -translate-x-full transition-transform duration-200" style="background: hsl(20,14%,5%); border-right: 1px solid hsl(25,8%,14%);">
            <!-- Sidebar content injected by app.js -->
        </div>

        <!-- Main Content -->
        <main class="flex-1 lg:ml-60 pt-14 lg:pt-0 min-w-0">
            <div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div id="page-content">
                    <!-- Page content rendered here -->
                    <div class="flex items-center justify-center h-64">
                        <div class="text-white/30">Cargando...</div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Toast Container -->
    <div id="toast-container" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"></div>

    <!-- Modal Overlay -->
    <div id="modal-overlay" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
        <div id="modal-content" class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style="background: hsl(25,10%,10%); border: 1px solid hsl(25,8%,18%);">
        </div>
    </div>

    <!-- JavaScript - Order matters -->
    <script src="/public/js/app.js"></script>
    <script src="/public/js/login.js"></script>
    <script src="/public/js/dashboard.js"></script>
    <script src="/public/js/remitos.js"></script>
    <script src="/public/js/eerr.js"></script>
    <script src="/public/js/stock.js"></script>
    <script src="/public/js/pedidos.js"></script>
    <script src="/public/js/configuracion.js"></script>
</body>
</html>
