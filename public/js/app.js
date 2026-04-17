/**
 * Mr Tasty App - Core Application Framework
 * SPA router, state management, and UI utilities
 */

const App = {
    // Application state
    state: {
        user: null,
        currentRoute: '/',
        stores: [],
        suppliers: [],
        products: [],
        isAuthenticated: false,
    },

    // Month names in Spanish
    monthNames: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ],

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Check authentication
            await this.checkAuth();

            if (this.state.isAuthenticated) {
                this.showApp();
                this.renderSidebar();
                await this.loadInitialData();
            } else {
                this.showLogin();
            }

            // Setup routing
            window.addEventListener('hashchange', () => this.handleRoute());
            this.handleRoute();

            // Setup mobile menu
            this.setupMobileMenu();
        } catch (err) {
            console.error('App init failed:', err);
            this.toast('Error al inicializar la aplicación', 'error');
            this.showLogin();
        }
    },

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me.php', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.state.user = data.user;
                this.state.isAuthenticated = true;
            } else {
                this.state.isAuthenticated = false;
                this.state.user = null;
            }
        } catch (err) {
            console.error('Auth check error:', err);
            this.state.isAuthenticated = false;
            this.state.user = null;
        }
    },

    /**
     * Show login view, hide app
     */
    showLogin() {
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('app-layout').classList.add('hidden');
    },

    /**
     * Show app, hide login
     */
    showApp() {
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
    },

    /**
     * Handle route changes
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        this.route(hash);
    },

    /**
     * Route to a specific page
     */
    async route(hash) {
        // Normalize hash (remove trailing slash, handle subroutes)
        const cleanHash = hash.replace(/\/$/, '') || '/';
        this.state.currentRoute = cleanHash;

        try {
            // Update sidebar active state
            this.updateSidebarActive();

            // Clear page content
            document.getElementById('page-content').innerHTML = '<div class="flex items-center justify-center h-64"><div class="text-white/30">Cargando...</div></div>';

            // Route to appropriate page
            if (cleanHash === '/') {
                await Dashboard.render();
            } else if (cleanHash === '/remitos') {
                await Remitos.render();
            } else if (cleanHash === '/eerr') {
                await EERR.render();
            } else if (cleanHash === '/stock') {
                await Stock.render();
            } else if (cleanHash === '/stock/mermas') {
                await Mermas.render();
            } else if (cleanHash === '/pedidos') {
                await Pedidos.render();
            } else if (cleanHash === '/configuracion') {
                await Configuracion.render();
            } else {
                // Unknown route, go to dashboard
                window.location.hash = '#/';
            }
        } catch (err) {
            console.error('Route error:', err);
            document.getElementById('page-content').innerHTML = `
                <div class="bg-red-500/10 border border-red-500/25 rounded-lg p-4 text-red-400">
                    <strong>Error:</strong> No se pudo cargar la página. Por favor intenta nuevamente.
                </div>
            `;
        }
    },

    /**
     * API request helper
     */
    async api(path, options = {}) {
        const method = options.method || 'GET';
        const headers = options.headers || {};
        let body = options.body;

        // Add JSON content type if body is object and not FormData
        if (body && typeof body === 'object' && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }

        try {
            const response = await fetch(path, {
                method,
                headers,
                body,
                credentials: 'include',
            });

            // Handle authentication errors
            if (response.status === 401) {
                this.handleAuthError();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API Error ${response.status}: ${error}`);
            }

            // Try to parse as JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (err) {
            console.error(`API request failed: ${path}`, err);
            throw err;
        }
    },

    /**
     * Handle authentication errors
     */
    handleAuthError() {
        this.state.user = null;
        this.state.isAuthenticated = false;
        this.showLogin();
        this.toast('Tu sesión ha expirado', 'info');
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.api('/api/auth/logout.php', { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            this.state.user = null;
            this.state.isAuthenticated = false;
            this.showLogin();
        }
    },

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // In parallel load stores, suppliers, products
            const [stores, suppliers, products] = await Promise.all([
                this.loadStores(),
                this.loadSuppliers(),
                this.loadProducts(),
            ]);
            return { stores, suppliers, products };
        } catch (err) {
            console.error('Failed to load initial data:', err);
            // Continue anyway - individual pages will retry
        }
    },

    /**
     * Load stores/locales
     */
    async loadStores() {
        try {
            this.state.stores = await this.api('/api/locales.php');
            return this.state.stores;
        } catch (err) {
            console.error('Load stores failed:', err);
            return [];
        }
    },

    /**
     * Load suppliers/proveedores
     */
    async loadSuppliers() {
        try {
            this.state.suppliers = await this.api('/api/proveedores.php');
            return this.state.suppliers;
        } catch (err) {
            console.error('Load suppliers failed:', err);
            return [];
        }
    },

    /**
     * Load products
     */
    async loadProducts() {
        try {
            this.state.products = await this.api('/api/productos.php');
            return this.state.products;
        } catch (err) {
            console.error('Load products failed:', err);
            return [];
        }
    },

    /**
     * Render sidebar navigation
     */
    renderSidebar() {
        const today = new Date().getDay();
        const isOrderDay = today === 1 || today === 3 || today === 5; // Mon, Wed, Fri

        const sidebarHTML = `
            <div class="flex flex-col h-full">
                <!-- Logo -->
                <div class="p-6 border-b" style="border-color: hsl(25,8%,16%);">
                    <div style="font-size: 18px; margin-bottom: 8px;">🍔</div>
                    <div class="text-brand-500 font-bold text-lg">Mr Tasty</div>
                    <div class="text-xs text-white/30 mt-2">Gestión de locales</div>
                </div>

                <!-- Alert if order day -->
                ${isOrderDay ? `
                    <div class="mx-3 mt-4 p-3 rounded-lg bg-gold/10 border border-gold/25 text-gold/90 text-xs font-medium">
                        <div style="font-weight: 600; margin-bottom: 4px;">📋 Día de pedidos</div>
                        <div>Recuerda completar el pedido a Blancaluna hoy</div>
                    </div>
                ` : ''}

                <!-- Navigation -->
                <nav class="flex-1 overflow-y-auto py-4">
                    <div class="nav-section-label">Principal</div>
                    <a href="#/" class="nav-link block px-3 py-3 rounded-lg text-white/60 hover:text-white transition-colors" data-route="/">
                        <svg class="w-5 h-5 inline mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                        </svg>
                        <span>Dashboard</span>
                    </a>

                    <div class="nav-section-label">Operaciones</div>
                    <a href="#/remitos" class="nav-link block px-3 py-3 rounded-lg text-white/60 hover:text-white transition-colors" data-route="/remitos">
                        <svg class="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <span>Remitos</span>
                    </a>

                    <a href="#/pedidos" class="nav-link block px-3 py-3 rounded-lg text-white/60 hover:text-white transition-colors" data-route="/pedidos">
                        <svg class="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span>Pedido BL</span>
                        <span class="badge badge-warning ml-2" style="font-size: 9px;">BL</span>
                    </a>

                    <div class="nav-section-label">Finanzas</div>
                    <a href="#/eerr" class="nav-link block px-3 py-3 rounded-lg text-white/60 hover:text-white transition-colors" data-route="/eerr">
                        <svg class="w-5 h-5 inline mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 13h2v8H3zm4-8h2v16H7zM21 4h-7v2h5v14h-5v2h7V4z"/>
                        </svg>
                        <span>EERR</span>
                    </a>

                    <div class="nav-section-label">Inventario</div>
                    <a href="#/stock" class="nav-link block px-3 py-3 rounded-lg text-white/60 hover:text-white transition-colors" data-route="/stock">
                        <svg class="w-5 h-5 inline mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span>Stock</span>
                    </a>

                    <a href="#/stock/mermas" class="nav-link block px-3 py-3 pl-12 rounded-lg text-white/60 hover:text-white transition-colors text-sm" data-route="/stock/mermas">
                        <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                        </svg>
                        <span>Mermas</span>
                    </a>

                    <div class="nav-section-label">Configuración</div>
                    <a href="#/configuracion" class="nav-link block px-3 py-3 rounded-lg text-white/60 hover:text-white transition-colors" data-route="/configuracion">
                        <svg class="w-5 h-5 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-width="1.5" fill="none"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>Configuración</span>
                    </a>
                </nav>

                <!-- Footer -->
                <div class="border-t p-4" style="border-color: hsl(25,8%,16%);">
                    <div class="text-xs text-white/30 mb-3">
                        v1.0.0 · PHP
                    </div>
                    <button id="logout-btn" class="w-full btn btn-outline text-xs py-2">
                        Cerrar sesión
                    </button>
                </div>
            </div>
        `;

        // Insert into both desktop and mobile sidebars
        document.getElementById('sidebar').innerHTML = sidebarHTML;
        document.getElementById('mobile-sidebar').innerHTML = sidebarHTML;

        // Add event listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                // Close mobile menu when clicking a link
                this.closeMobileMenu();
            });
        });

        // Logout button
        const logoutBtns = document.querySelectorAll('#logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });

        // Update active state
        this.updateSidebarActive();
    },

    /**
     * Update active nav link
     */
    updateSidebarActive() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            if (route === this.state.currentRoute) {
                link.classList.add('nav-active');
                link.classList.remove('text-white/60', 'hover:text-white');
            } else {
                link.classList.remove('nav-active');
                link.classList.add('text-white/60', 'hover:text-white');
            }
        });
    },

    /**
     * Setup mobile menu toggle
     */
    setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const mobileSidebar = document.getElementById('mobile-sidebar');

        menuToggle.addEventListener('click', () => {
            this.openMobileMenu();
        });

        mobileOverlay.addEventListener('click', () => {
            this.closeMobileMenu();
        });
    },

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        document.getElementById('mobile-overlay').classList.remove('hidden');
        document.getElementById('mobile-sidebar').classList.remove('-translate-x-full');
    },

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        document.getElementById('mobile-overlay').classList.add('hidden');
        document.getElementById('mobile-sidebar').classList.add('-translate-x-full');
    },

    /**
     * Show toast notification
     */
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;

        // Icon based on type
        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        toast.innerHTML = `
            <span style="font-size: 16px; font-weight: bold;">${icons[type] || '•'}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.2s ease reverse';
            setTimeout(() => toast.remove(), 200);
        }, 4000);
    },

    /**
     * Show modal dialog
     */
    openModal(contentHTML, options = {}) {
        const overlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');

        modalContent.innerHTML = contentHTML;
        overlay.classList.remove('hidden');

        // Close on overlay click
        const closeHandler = (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        };
        overlay.addEventListener('click', closeHandler);

        // Store handler for cleanup
        overlay._closeHandler = closeHandler;

        // Call onOpen callback if provided
        if (options.onOpen) options.onOpen();

        return {
            close: () => this.closeModal()
        };
    },

    /**
     * Close modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('hidden');

        // Remove event listener
        if (overlay._closeHandler) {
            overlay.removeEventListener('click', overlay._closeHandler);
        }

        document.getElementById('modal-content').innerHTML = '';
    },

    /**
     * Navigate to a route
     */
    navigate(route) {
        window.location.hash = route;
    },

    /**
     * Format currency (ARS)
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(amount || 0);
    },

    /**
     * Format date (YYYY-MM-DD or ISO -> DD/MM/YYYY)
     */
    formatDate(dateStr) {
        if (!dateStr) return '-';

        // Handle YYYY-MM-DD format
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }

        // Try parsing as date
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }

        return dateStr;
    },

    /**
     * Get today as YYYY-MM-DD
     */
    todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    /**
     * Get current year and month
     */
    getCurrentYearMonth() {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
    },

    /**
     * Format time (HH:MM)
     */
    formatTime(timeStr) {
        if (!timeStr) return '-';
        const match = timeStr.match(/^(\d{2}):(\d{2})/);
        return match ? `${match[1]}:${match[2]}` : timeStr;
    },

    /**
     * Render horizontal bar chart
     */
    renderBarChart(data, options = {}) {
        const { height = 250, formatValue = (v) => v, colors = [] } = options;
        const maxValue = Math.max(...data.map(d => d.value));

        const bars = data.map((item, idx) => {
            const barWidth = (item.value / maxValue) * 85; // 85% width for labels
            const color = item.color || colors[idx] || '#f97316';

            return `
                <g transform="translate(0, ${idx * 40})">
                    <text x="0" y="20" font-size="12" fill="rgba(255,255,255,0.6)" text-anchor="start">${item.label}</text>
                    <rect x="110" y="8" width="${barWidth}" height="16" fill="${color}" rx="4"/>
                    <text x="200" y="20" font-size="12" fill="rgba(255,255,255,0.8)" font-weight="500">${formatValue(item.value)}</text>
                </g>
            `;
        }).join('');

        return `
            <svg width="100%" height="${height}" viewBox="0 0 400 ${data.length * 40}" class="chart-container">
                ${bars}
            </svg>
        `;
    },

    /**
     * Render line chart with area fill
     */
    renderLineChart(data, options = {}) {
        const { height = 250, color = '#f97316', formatValue = (v) => v, showArea = true } = options;

        if (!data || data.length === 0) {
            return '<div class="text-center text-white/30 py-8">Sin datos</div>';
        }

        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;

        const padding = 40;
        const chartWidth = 500;
        const chartHeight = height - (padding * 2);

        // Generate points
        const points = data.map((item, idx) => {
            const x = (chartWidth / (data.length - 1 || 1)) * idx + padding;
            const y = chartHeight - ((item.value - minValue) / range * chartHeight) + padding;
            return { x, y, ...item };
        });

        // Path data
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        // Area path (close the shape)
        const areaPath = `${pathData} L ${points[points.length - 1].x} ${chartHeight + padding} L ${points[0].x} ${chartHeight + padding} Z`;

        // Grid lines
        const gridLines = Array.from({ length: 5 }, (_, i) => {
            const y = padding + (chartHeight / 4) * i;
            const label = maxValue - ((maxValue - minValue) / 4) * i;
            return `
                <line x1="${padding}" y1="${y}" x2="${chartWidth + padding}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                <text x="${padding - 5}" y="${y + 4}" font-size="11" fill="rgba(255,255,255,0.3)" text-anchor="end">${Math.round(label)}</text>
            `;
        }).join('');

        // Dots at data points
        const dots = points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" stroke="hsl(25,10%,10%)" stroke-width="2"/>
        `).join('');

        // Labels
        const labels = points.map(p => `
            <text x="${p.x}" y="${chartHeight + padding + 20}" font-size="11" fill="rgba(255,255,255,0.4)" text-anchor="middle">${p.label || ''}</text>
        `).join('');

        return `
            <svg width="100%" height="${height}" viewBox="0 0 ${chartWidth + padding * 2} ${height}" class="chart-container">
                <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color: ${color}; stop-opacity: 0.2"/>
                        <stop offset="100%" style="stop-color: ${color}; stop-opacity: 0"/>
                    </linearGradient>
                </defs>
                ${gridLines}
                ${showArea ? `<path d="${areaPath}" fill="url(#areaGradient)"/>` : ''}
                <path d="${pathData}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                ${dots}
                ${labels}
            </svg>
        `;
    },

    /**
     * Show confirm dialog
     */
    confirm(message) {
        return new Promise((resolve) => {
            const html = `
                <div class="modal-header">
                    <h2 class="modal-title">Confirmar</h2>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-btn">Cancelar</button>
                    <button class="btn btn-primary" id="confirm-btn">Confirmar</button>
                </div>
            `;

            this.openModal(html, {
                onOpen: () => {
                    document.getElementById('cancel-btn').addEventListener('click', () => {
                        this.closeModal();
                        resolve(false);
                    });
                    document.getElementById('confirm-btn').addEventListener('click', () => {
                        this.closeModal();
                        resolve(true);
                    });
                }
            });
        });
    },

    /**
     * Utility: Parse query string
     */
    parseQuery(queryStr) {
        const params = new URLSearchParams(queryStr);
        const obj = {};
        params.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    },

    /**
     * Utility: Check if string is valid email
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Utility: Deep clone object
     */
    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Utility: Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
