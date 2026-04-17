// Dashboard Page Module
// Displays key metrics, trends, and quick access to main features

const DashboardPage = {
  state: {
    selectedMonth: null,
    selectedYear: null,
    selectedStore: 'all',
    summary: null,
    trend: [],
    loading: true,
  },

  async render() {
    const pageContent = document.getElementById('page-content');

    // Set default month/year from current date
    const today = App.getCurrentYearMonth();
    this.state.selectedMonth = this.state.selectedMonth || today.month;
    this.state.selectedYear = this.state.selectedYear || today.year;

    // Render skeleton/loading state
    pageContent.innerHTML = this.getLoadingSkeleton();

    // Load data in parallel
    try {
      await this.loadData();
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error loading dashboard:', error);
      pageContent.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="text-red-400 text-center">
            <p class="mb-2">Error al cargar el dashboard</p>
            <p class="text-white/50 text-sm">${error.message}</p>
          </div>
        </div>
      `;
    }
  },

  async loadData() {
    try {
      const storeId = this.state.selectedStore === 'all' ? null : this.state.selectedStore;

      // Build query params
      const summaryParams = new URLSearchParams({
        month: this.state.selectedMonth,
        year: this.state.selectedYear,
      });
      if (storeId) summaryParams.append('storeId', storeId);

      const trendParams = new URLSearchParams({
        months: '12',
      });
      if (storeId) trendParams.append('storeId', storeId);

      // Load in parallel
      const [summaryResponse, trendResponse] = await Promise.all([
        App.api(`/api/remitos_summary.php?${summaryParams}`),
        App.api(`/api/remitos_trend.php?${trendParams}`),
      ]);

      this.state.summary = summaryResponse;
      this.state.trend = trendResponse.trend || [];
      this.state.loading = false;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.state.loading = false;
      throw error;
    }
  },

  getLoadingSkeleton() {
    return `
      <div class="space-y-6">
        <!-- Header skeleton -->
        <div class="h-12 bg-white/5 rounded-lg animate-pulse"></div>

        <!-- KPI Cards skeleton -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${Array(4).fill(0).map(() => `
            <div class="p-6 rounded-lg" style="background: hsl(25,10%,10%); border: 1px solid hsl(25,8%,18%);">
              <div class="h-4 bg-white/5 rounded w-2/3 mb-3 animate-pulse"></div>
              <div class="h-8 bg-white/5 rounded w-full animate-pulse"></div>
            </div>
          `).join('')}
        </div>

        <!-- Chart skeleton -->
        <div class="p-6 rounded-lg" style="background: hsl(25,10%,10%); border: 1px solid hsl(25,8%,18%);">
          <div class="h-4 bg-white/5 rounded w-1/4 mb-4 animate-pulse"></div>
          <div class="h-64 bg-white/5 rounded animate-pulse"></div>
        </div>
      </div>
    `;
  },

  getHTML() {
    // Check if today is an order day (Monday=1, Wednesday=3, Friday=5)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isOrderDay = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;

    // Month/year for display
    const monthName = App.monthNames[this.state.selectedMonth - 1];
    const yearStr = this.state.selectedYear.toString();

    let html = '';

    // Page Header with Filters
    html += `
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-6">
          <span style="font-size: 28px;">📊</span>
          <div>
            <h1 class="text-3xl font-bold text-white">Dashboard</h1>
            <p class="text-white/50 text-sm">Resumen de compras y operaciones</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label for="filter-month" class="block text-white/70 text-sm mb-1">Mes</label>
            <select id="filter-month" class="px-4 py-2 rounded-lg text-white text-sm" style="background: hsl(25,8%,14%); border: 1px solid hsl(25,8%,18%); color: hsl(40,15%,92%);">
              ${Array.from({ length: 12 }, (_, i) => {
                const monthNum = i + 1;
                const monthLabel = App.monthNames[i];
                const selected = monthNum === this.state.selectedMonth ? 'selected' : '';
                return `<option value="${monthNum}" ${selected}>${monthLabel}</option>`;
              }).join('')}
            </select>
          </div>

          <div>
            <label for="filter-year" class="block text-white/70 text-sm mb-1">Año</label>
            <select id="filter-year" class="px-4 py-2 rounded-lg text-white text-sm" style="background: hsl(25,8%,14%); border: 1px solid hsl(25,8%,18%); color: hsl(40,15%,92%);">
              ${[2025, 2026, 2027].map(year => {
                const selected = year === this.state.selectedYear ? 'selected' : '';
                return `<option value="${year}" ${selected}>${year}</option>`;
              }).join('')}
            </select>
          </div>

          <div>
            <label for="filter-store" class="block text-white/70 text-sm mb-1">Local</label>
            <select id="filter-store" class="px-4 py-2 rounded-lg text-white text-sm" style="background: hsl(25,8%,14%); border: 1px solid hsl(25,8%,18%); color: hsl(40,15%,92%);">
              <option value="all">Todos</option>
              ${App.state.stores.map(store => `
                <option value="${store.id}" ${store.id.toString() === this.state.selectedStore ? 'selected' : ''}>${store.name}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>
    `;

    // Order Day Banner (if applicable)
    if (isOrderDay) {
      html += `
        <div class="mb-6 p-4 rounded-lg" style="background: linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(251,146,60,0.1) 100%); border: 1px solid rgba(249,115,22,0.5);">
          <div class="flex items-center gap-3">
            <span style="font-size: 24px;">📦</span>
            <div>
              <p class="text-orange-300 font-semibold">Día de pedido BLANCALUNA</p>
              <p class="text-white/60 text-sm">No olvides cargar el pedido hoy</p>
            </div>
          </div>
        </div>
      `;
    }

    // Check if there's data
    const hasData = this.state.summary && this.state.summary.total_remitos > 0;

    if (!hasData) {
      // Empty state
      html += `
        <div class="py-12 text-center">
          <div style="font-size: 64px; margin-bottom: 16px;">📭</div>
          <h2 class="text-2xl font-bold text-white mb-2">Sin remitos este mes</h2>
          <p class="text-white/60 mb-6">No hay remitos registrados para ${monthName} ${yearStr}</p>
          <a href="#remitos" class="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all" style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); box-shadow: 0 4px 15px rgba(249,115,22,0.3);">
            <span>Cargar primer remito</span>
            <span>→</span>
          </a>
        </div>
      `;
    } else {
      // KPI Cards
      const summary = this.state.summary;
      const kpis = [
        {
          label: 'Total del mes',
          value: App.formatCurrency(summary.grand_total),
          icon: '💰',
          trend: '+2.5%',
        },
        {
          label: 'Remitos cargados',
          value: summary.total_remitos.toString(),
          icon: '📄',
          trend: 'en el mes',
        },
        {
          label: 'Proveedores',
          value: summary.by_supplier.length.toString(),
          icon: '🏢',
          trend: 'registrados',
        },
        {
          label: 'Locales',
          value: (App.state.stores.length || 0).toString(),
          icon: '🍔',
          trend: 'activos',
        },
      ];

      html += `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          ${kpis.map(kpi => `
            <div class="p-6 rounded-2xl border transition-all hover:border-orange-400/50" style="background: hsl(25,10%,10%); border-color: hsl(25,8%,18%); cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <p class="text-white/60 text-sm font-medium">${kpi.label}</p>
                  <p class="text-2xl font-bold text-white mt-1">${kpi.value}</p>
                </div>
                <span style="font-size: 28px;">${kpi.icon}</span>
              </div>
              <p class="text-orange-400 text-xs">${kpi.trend}</p>
            </div>
          `).join('')}
        </div>

        <!-- Trend Chart -->
        <div class="mb-8 p-6 rounded-2xl border" style="background: hsl(25,10%,10%); border-color: hsl(25,8%,18%);">
          <h2 class="text-lg font-bold text-white mb-6">Evolución de compras — últimos 12 meses</h2>
          <div style="overflow-x: auto;">
            ${this.renderTrendChart()}
          </div>
        </div>

        <!-- Two-column grid: Suppliers and Stores -->
        <div class="grid lg:grid-cols-3 gap-6 mb-8">
          <!-- Suppliers (3/5 width on desktop) -->
          <div class="lg:col-span-2 p-6 rounded-2xl border" style="background: hsl(25,10%,10%); border-color: hsl(25,8%,18%);">
            <h2 class="text-lg font-bold text-white mb-6">Totales por proveedor</h2>
            ${this.renderSupplierChart()}
          </div>

          <!-- Stores (2/5 width on desktop) -->
          <div class="p-6 rounded-2xl border" style="background: hsl(25,10%,10%); border-color: hsl(25,8%,18%);">
            <h2 class="text-lg font-bold text-white mb-6">Por local</h2>
            <div class="space-y-3">
              ${summary.by_store.map(store => `
                <div class="p-3 rounded-lg" style="background: hsl(25,8%,14%);">
                  <p class="text-white/80 text-sm font-medium">${store.store_name}</p>
                  <p class="text-orange-400 font-bold">${App.formatCurrency(store.total)}</p>
                  <p class="text-white/40 text-xs">${store.count} remitos</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Quick Access Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          ${this.getQuickAccessCards()}
        </div>
      `;
    }

    return html;
  },

  renderTrendChart() {
    if (!this.state.trend || this.state.trend.length === 0) {
      return '<p class="text-white/50 text-center py-8">Sin datos de tendencia</p>';
    }

    // Prepare data for chart
    const chartData = this.state.trend.map(item => ({
      label: item.label,
      value: item.value,
    }));

    return App.renderLineChart(chartData, {
      width: Math.min(window.innerWidth - 60, 800),
      height: 250,
    });
  },

  renderSupplierChart() {
    if (!this.state.summary || this.state.summary.by_supplier.length === 0) {
      return '<p class="text-white/50 text-center py-8">Sin proveedores</p>';
    }

    const suppliers = this.state.summary.by_supplier.slice(0, 8);

    // Prepare data for chart
    const chartData = suppliers.map(supplier => ({
      label: supplier.supplier_name || 'Sin proveedor',
      value: supplier.total,
    }));

    const chartHTML = App.renderBarChart(chartData, {
      width: 500,
      height: 300,
      horizontal: true,
    });

    let html = `<div style="overflow-x: auto; margin-bottom: 20px;">${chartHTML}</div>`;

    // List below chart
    html += '<div class="space-y-2">';
    suppliers.forEach(supplier => {
      html += `
        <div class="flex items-center justify-between p-3 rounded-lg" style="background: hsl(25,8%,14%);">
          <div>
            <p class="text-white/80 text-sm font-medium">${supplier.supplier_name || 'Sin proveedor'}</p>
            <p class="text-white/40 text-xs">${supplier.count} remitos</p>
          </div>
          <p class="text-orange-400 font-bold">${App.formatCurrency(supplier.total)}</p>
        </div>
      `;
    });
    html += '</div>';

    return html;
  },

  getQuickAccessCards() {
    const cards = [
      {
        icon: '📄',
        label: 'Remitos',
        desc: 'Cargar nuevos remitos',
        route: 'remitos',
        color: 'from-blue-600 to-blue-700',
      },
      {
        icon: '📋',
        label: 'EERR',
        desc: 'Estado de resultados',
        route: 'eerr',
        color: 'from-emerald-600 to-emerald-700',
      },
      {
        icon: '📦',
        label: 'Stock',
        desc: 'Gestión de inventario',
        route: 'stock',
        color: 'from-purple-600 to-purple-700',
      },
      {
        icon: '🛒',
        label: 'Pedido BL',
        desc: 'Pedido BLANCALUNA',
        route: 'pedidos',
        color: 'from-pink-600 to-pink-700',
      },
    ];

    return cards.map(card => `
      <a href="#${card.route}" class="group p-4 rounded-xl border transition-all hover:border-white/20 hover:scale-105 cursor-pointer" style="background: hsl(25,10%,10%); border-color: hsl(25,8%,18%); text-decoration: none;">
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 rounded-lg" style="background: linear-gradient(135deg, var(--color-from), var(--color-to)); --color-from: ${card.color.split(' ')[1]}; --color-to: ${card.color.split(' ')[3]};">
            <span style="font-size: 20px; display: block;">${card.icon}</span>
          </div>
          <div>
            <p class="text-white font-semibold text-sm">${card.label}</p>
            <p class="text-white/50 text-xs">${card.desc}</p>
          </div>
        </div>
      </a>
    `).join('');
  },

  bindEvents() {
    const monthSelect = document.getElementById('filter-month');
    const yearSelect = document.getElementById('filter-year');
    const storeSelect = document.getElementById('filter-store');

    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        this.state.selectedMonth = parseInt(e.target.value);
        this.render();
      });
    }

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        this.state.selectedYear = parseInt(e.target.value);
        this.render();
      });
    }

    if (storeSelect) {
      storeSelect.addEventListener('change', (e) => {
        this.state.selectedStore = e.target.value;
        this.render();
      });
    }
  },
};

// Placeholder page modules (to be implemented)
const RemitoPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="text-center py-12">
        <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
        <h1 class="text-2xl font-bold text-white mb-2">Remitos</h1>
        <p class="text-white/60">Módulo de remitos (en desarrollo)</p>
      </div>
    `;
  },
};

const EERRPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="text-center py-12">
        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
        <h1 class="text-2xl font-bold text-white mb-2">EERR</h1>
        <p class="text-white/60">Estado de resultados (en desarrollo)</p>
      </div>
    `;
  },
};

const StockPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="text-center py-12">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <h1 class="text-2xl font-bold text-white mb-2">Stock</h1>
        <p class="text-white/60">Gestión de inventario (en desarrollo)</p>
      </div>
    `;
  },
};

const PedidosPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="text-center py-12">
        <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
        <h1 class="text-2xl font-bold text-white mb-2">Pedido BLANCALUNA</h1>
        <p class="text-white/60">Gestión de pedidos (en desarrollo)</p>
      </div>
    `;
  },
};

const ConfigPage = {
  render() {
    document.getElementById('page-content').innerHTML = `
      <div class="text-center py-12">
        <div style="font-size: 48px; margin-bottom: 16px;">⚙️</div>
        <h1 class="text-2xl font-bold text-white mb-2">Configuración</h1>
        <p class="text-white/60">Configuración de la aplicación (en desarrollo)</p>
      </div>
    `;
  },
};
