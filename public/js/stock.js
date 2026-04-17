// Mr Tasty App - Stock Management Pages
// Stock snapshots and Mermas (adjustments)

const StockPage = {
  state: {
    selectedStore: '',
    snapshots: [],
    latest: null,
    loading: true,
    trendProduct: null,
    trendData: [],
    products: [],
  },

  async render() {
    const pageContent = document.getElementById('page-content');

    // Default to first store if none selected
    if (!this.state.selectedStore && App.state.stores.length > 0) {
      this.state.selectedStore = App.state.stores[0].id;
    }

    this.state.loading = true;
    pageContent.innerHTML = `<div class="p-8"><div class="text-white/50">Cargando...</div></div>`;

    await this.loadData();
    pageContent.innerHTML = this.getHTML();
    this.bindEvents();
  },

  async loadData() {
    try {
      // Load products first
      const productsResponse = await App.api('/api/products.php');
      this.state.products = productsResponse.products || [];
      App.state.products = this.state.products;

      // Load all snapshots
      const snapshotsResponse = await App.api(`/api/stock.php?storeId=${this.state.selectedStore}`);
      this.state.snapshots = snapshotsResponse.snapshots || [];

      // Load latest snapshot
      const latestResponse = await App.api(`/api/stock.php?storeId=${this.state.selectedStore}&latest=true`);
      this.state.latest = latestResponse.snapshot || null;

      this.state.loading = false;
    } catch (error) {
      console.error('Error loading stock data:', error);
      this.state.loading = false;
      App.toast('Error cargando datos de stock', 'error');
    }
  },

  getHTML() {
    return `
      <div class="p-8 max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">📦 Stock</h1>
            <p class="text-white/50">Gestiona snapshots e historial de stock</p>
          </div>
          <div class="flex items-center gap-3">
            <select id="store-select" class="form-select bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
              ${App.state.stores.map(store => `
                <option value="${store.id}" ${store.id === this.state.selectedStore ? 'selected' : ''}>
                  ${store.name}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 mb-8">
          <button id="new-snapshot-btn" class="btn btn-primary">
            + Nuevo snapshot
          </button>
          <button id="upload-photo-btn" class="btn btn-outline">
            📸 Subir foto stock
          </button>
          <button id="recalcular-btn" class="btn btn-ghost">
            🔄 Recalcular consumo
          </button>
        </div>

        <!-- Stock Actual Card -->
        <div class="card mb-8">
          <div class="card-header flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl font-bold text-white">Stock actual</h2>
              ${this.state.latest ? `
                <span class="text-sm text-white/50">${App.formatDate(this.state.latest.date)}</span>
                <span class="badge ${this.state.latest.source === 'manual' ? 'badge-default' : 'badge-blue'}">
                  ${this.state.latest.source === 'manual' ? 'Manual' : 'Foto'}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="card-content">
            ${this.state.latest ? `
              <div class="grid grid-2 gap-4">
                ${this.state.latest.items.map(item => {
                  const product = this.state.products.find(p => p.id === item.productId);
                  return `
                    <div class="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div class="flex items-center justify-between mb-2">
                        <h3 class="font-semibold text-white">${product ? product.name : 'Producto desconocido'}</h3>
                      </div>
                      <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-orange-400">${item.quantity}</span>
                        <span class="text-white/50">${product ? product.unit : 'unidad'}</span>
                      </div>
                      ${product && product.safetyStock ? `
                        <div class="mt-2 text-xs text-white/40">
                          Stock seguridad: ${product.safetyStock} ${product.unit}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="text-center py-12">
                <p class="text-white/50 mb-4">Sin stock cargado aún</p>
                <button class="btn btn-primary" onclick="StockPage.openNewSnapshotModal()">
                  Crear primer snapshot
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- Trend Chart -->
        <div class="card mb-8">
          <div class="card-header">
            <h2 class="text-2xl font-bold text-white">Evolución de Stock</h2>
          </div>
          <div class="card-content">
            <div class="mb-4">
              <label class="form-label text-white/70">Seleccionar producto:</label>
              <select id="trend-product-select" class="form-select bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
                <option value="">-- Elegir producto --</option>
                ${this.state.products.map(p => `
                  <option value="${p.id}">${p.name}</option>
                `).join('')}
              </select>
            </div>
            <div id="trend-chart-container" class="bg-white/5 rounded-lg p-4 border border-white/10 min-h-[300px] flex items-center justify-center text-white/50">
              Selecciona un producto para ver su evolución
            </div>
          </div>
        </div>

        <!-- Historial de Snapshots -->
        <div class="card">
          <div class="card-header">
            <h2 class="text-2xl font-bold text-white">Historial de snapshots</h2>
          </div>
          <div class="card-content">
            ${this.state.snapshots.length > 0 ? `
              <div class="data-table">
                <table class="w-full text-sm">
                  <thead class="border-b border-white/10">
                    <tr class="text-white/70">
                      <th class="text-left py-3 px-4">Fecha</th>
                      <th class="text-left py-3 px-4">Local</th>
                      <th class="text-left py-3 px-4">Fuente</th>
                      <th class="text-left py-3 px-4">Items</th>
                      <th class="text-right py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.state.snapshots.map(snapshot => {
                      const store = App.state.stores.find(s => s.id === snapshot.storeId);
                      return `
                        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td class="py-3 px-4 text-white">${App.formatDate(snapshot.date)}</td>
                          <td class="py-3 px-4 text-white/70">${store ? store.name : 'Desconocido'}</td>
                          <td class="py-3 px-4">
                            <span class="badge ${snapshot.source === 'manual' ? 'badge-default' : 'badge-blue'}">
                              ${snapshot.source === 'manual' ? 'Manual' : 'Foto'}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-white/70">${snapshot.items.length} items</td>
                          <td class="py-3 px-4 text-right">
                            <button class="text-orange-400 hover:text-orange-300 text-sm mr-3" onclick="StockPage.viewSnapshot('${snapshot.id}')">
                              Ver
                            </button>
                            <button class="text-red-400 hover:text-red-300 text-sm" onclick="StockPage.deleteSnapshot('${snapshot.id}')">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="text-center py-12">
                <p class="text-white/50">No hay snapshots registrados aún</p>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Hidden file input for photo upload -->
      <input type="file" id="stock-photo-input" accept="image/*" class="hidden">
    `;
  },

  bindEvents() {
    // Store select change
    document.getElementById('store-select').addEventListener('change', (e) => {
      this.state.selectedStore = e.target.value;
      this.render();
    });

    // New snapshot button
    document.getElementById('new-snapshot-btn').addEventListener('click', () => {
      this.openNewSnapshotModal();
    });

    // Upload photo button
    document.getElementById('upload-photo-btn').addEventListener('click', () => {
      document.getElementById('stock-photo-input').click();
    });

    // Photo input change
    document.getElementById('stock-photo-input').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleStockImageUpload(e.target.files[0]);
      }
    });

    // Recalcular consumo button
    document.getElementById('recalcular-btn').addEventListener('click', () => {
      this.recalcularConsumo();
    });

    // Trend product select
    document.getElementById('trend-product-select').addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadTrendData(e.target.value);
      }
    });
  },

  openNewSnapshotModal() {
    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Nuevo Snapshot</h2>

        <form id="snapshot-form" class="space-y-6">
          <!-- Date -->
          <div>
            <label class="form-label text-gray-700">Fecha</label>
            <input type="date" id="snapshot-date" class="form-input w-full" value="${App.todayStr()}" required>
          </div>

          <!-- Source -->
          <div>
            <label class="form-label text-gray-700">Fuente</label>
            <select id="snapshot-source" class="form-select w-full">
              <option value="manual">Manual</option>
              <option value="foto">Foto (OCR)</option>
            </select>
          </div>

          <!-- Notes -->
          <div>
            <label class="form-label text-gray-700">Notas (opcional)</label>
            <textarea id="snapshot-notes" class="form-input w-full h-20" placeholder="Anotaciones adicionales..."></textarea>
          </div>

          <!-- Products Table -->
          <div>
            <label class="form-label text-gray-700 mb-2 block">Cantidades por producto</label>
            <div class="space-y-2 max-h-80 overflow-y-auto">
              ${this.state.products.map(product => `
                <div class="flex items-center gap-4 p-3 bg-gray-50 rounded">
                  <label class="flex-1 text-gray-700 font-medium">${product.name}</label>
                  <div class="flex items-center gap-2">
                    <input type="number"
                      class="form-input w-20 product-qty"
                      data-product-id="${product.id}"
                      placeholder="0"
                      step="0.01"
                      min="0">
                    <span class="text-gray-600 w-16">${product.unit}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t">
            <button type="button" data-close-modal class="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              Guardar Snapshot
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal(html);

    document.getElementById('snapshot-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSnapshot();
    });
  },

  async saveSnapshot() {
    const date = document.getElementById('snapshot-date').value;
    const source = document.getElementById('snapshot-source').value;
    const notes = document.getElementById('snapshot-notes').value;

    // Collect product quantities
    const items = [];
    document.querySelectorAll('.product-qty').forEach(input => {
      const qty = parseFloat(input.value);
      if (qty > 0 || qty === 0) {
        items.push({
          productId: input.dataset.productId,
          quantity: qty,
        });
      }
    });

    if (items.length === 0) {
      App.toast('Agrega al menos un producto con cantidad', 'warning');
      return;
    }

    try {
      await App.api('/api/stock.php', {
        method: 'POST',
        body: JSON.stringify({
          storeId: this.state.selectedStore,
          date,
          source,
          notes,
          items,
        }),
      });

      App.closeModal();
      App.toast('Snapshot guardado exitosamente', 'success');
      await this.loadData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error saving snapshot:', error);
      App.toast('Error al guardar snapshot', 'error');
    }
  },

  async handleStockImageUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'stock');

    try {
      const response = await fetch('/api/upload.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error uploading image');
      }

      // Open review modal with parsed items
      this.openPhotoReviewModal(data.items || []);
    } catch (error) {
      console.error('Error uploading photo:', error);
      App.toast('Error cargando foto: ' + error.message, 'error');
    }
  },

  openPhotoReviewModal(parsedItems) {
    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Revisar items detectados</h2>

        <form id="photo-review-form" class="space-y-6">
          <div class="space-y-3 max-h-80 overflow-y-auto">
            ${parsedItems.map((item, index) => `
              <div class="flex items-center gap-4 p-3 bg-gray-50 rounded">
                <div class="flex-1">
                  <select class="form-select w-full product-select" data-index="${index}" required>
                    <option value="">-- Seleccionar producto --</option>
                    ${this.state.products.map(p => `
                      <option value="${p.id}" ${p.name.toLowerCase().includes(item.productName?.toLowerCase() || '') ? 'selected' : ''}>
                        ${p.name}
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <input type="number"
                    class="form-input w-20 photo-qty"
                    data-index="${index}"
                    value="${item.quantity || 0}"
                    step="0.01"
                    min="0">
                  <span class="text-gray-600 w-12">unidad</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t">
            <button type="button" data-close-modal class="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              Guardar desde Foto
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal(html);

    document.getElementById('photo-review-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const items = [];
      document.querySelectorAll('.product-select').forEach((select, index) => {
        if (select.value) {
          items.push({
            productId: select.value,
            quantity: parseFloat(document.querySelectorAll('.photo-qty')[index].value),
          });
        }
      });

      if (items.length === 0) {
        App.toast('Selecciona al menos un producto', 'warning');
        return;
      }

      try {
        await App.api('/api/stock.php', {
          method: 'POST',
          body: JSON.stringify({
            storeId: this.state.selectedStore,
            date: App.todayStr(),
            source: 'foto',
            notes: 'Detectado por OCR',
            items,
          }),
        });

        App.closeModal();
        App.toast('Stock guardado desde foto', 'success');
        await this.loadData();
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = this.getHTML();
        this.bindEvents();
      } catch (error) {
        console.error('Error saving photo stock:', error);
        App.toast('Error guardando stock', 'error');
      }
    });
  },

  viewSnapshot(id) {
    const snapshot = this.state.snapshots.find(s => s.id === id);
    if (!snapshot) return;

    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Detalle de Snapshot</h2>
        <div class="space-y-4 text-gray-900">
          <div class="grid grid-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Fecha</p>
              <p class="font-semibold">${App.formatDate(snapshot.date)}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Fuente</p>
              <p class="font-semibold">${snapshot.source === 'manual' ? 'Manual' : 'Foto (OCR)'}</p>
            </div>
          </div>

          ${snapshot.notes ? `
            <div>
              <p class="text-sm text-gray-600">Notas</p>
              <p class="text-gray-800">${snapshot.notes}</p>
            </div>
          ` : ''}

          <div>
            <p class="text-sm text-gray-600 mb-3">Productos</p>
            <div class="space-y-2">
              ${snapshot.items.map(item => {
                const product = this.state.products.find(p => p.id === item.productId);
                return `
                  <div class="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <span>${product ? product.name : 'Desconocido'}</span>
                    <span class="font-semibold">${item.quantity} ${product ? product.unit : 'unidad'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="flex gap-3 justify-end pt-6 border-t mt-6">
          <button data-close-modal class="btn btn-outline">
            Cerrar
          </button>
        </div>
      </div>
    `;

    App.openModal(html);
  },

  async deleteSnapshot(id) {
    if (!App.confirm('¿Eliminar este snapshot? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await App.api(`/api/stock.php?id=${id}`, { method: 'DELETE' });
      App.toast('Snapshot eliminado', 'success');
      await this.loadData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      App.toast('Error eliminando snapshot', 'error');
    }
  },

  async loadTrendData(productId) {
    try {
      const response = await App.api(`/api/stock.php?storeId=${this.state.selectedStore}&productId=${productId}`);
      const data = response.snapshots || [];

      if (data.length === 0) {
        document.getElementById('trend-chart-container').innerHTML = `
          <p class="text-white/50">Sin datos de evolución para este producto</p>
        `;
        return;
      }

      // Extract product quantities
      const trendData = data
        .filter(s => s.items && s.items.length > 0)
        .map(snapshot => {
          const item = snapshot.items.find(i => i.productId === productId);
          return {
            label: App.formatDate(snapshot.date).substring(0, 5),
            value: item ? item.quantity : 0,
          };
        })
        .slice(-20); // Last 20 snapshots

      const chartHTML = App.renderLineChart(trendData, {
        width: 500,
        height: 250,
        maxValue: Math.max(...trendData.map(d => d.value)) || 100,
      });

      document.getElementById('trend-chart-container').innerHTML = chartHTML;
    } catch (error) {
      console.error('Error loading trend data:', error);
      App.toast('Error cargando tendencia', 'error');
    }
  },

  async recalcularConsumo() {
    if (!App.confirm('¿Recalcular baselines de consumo? Esto puede tomar unos momentos.')) {
      return;
    }

    try {
      const response = await App.api('/api/stock_calcular_consumo.php', {
        method: 'POST',
        body: JSON.stringify({
          storeId: this.state.selectedStore,
        }),
      });

      App.toast('Consumo recalculado exitosamente', 'success');
    } catch (error) {
      console.error('Error recalculating consumption:', error);
      App.toast('Error recalculando consumo', 'error');
    }
  },
};

const MermasPage = {
  state: {
    selectedStore: 'all',
    adjustments: [],
    loading: true,
  },

  async render() {
    const pageContent = document.getElementById('page-content');

    this.state.loading = true;
    pageContent.innerHTML = `<div class="p-8"><div class="text-white/50">Cargando...</div></div>`;

    await this.loadData();
    pageContent.innerHTML = this.getHTML();
    this.bindEvents();
  },

  async loadData() {
    try {
      const query = this.state.selectedStore === 'all'
        ? '/api/stock_ajustes.php?limit=100'
        : `/api/stock_ajustes.php?storeId=${this.state.selectedStore}&limit=100`;

      const response = await App.api(query);
      this.state.adjustments = response.adjustments || [];
      this.state.loading = false;
    } catch (error) {
      console.error('Error loading adjustments:', error);
      this.state.loading = false;
      App.toast('Error cargando mermas', 'error');
    }
  },

  getHTML() {
    const thisMonth = new Date();
    const currentMonthAdjustments = this.state.adjustments.filter(a => {
      const aDate = new Date(a.date);
      return aDate.getMonth() === thisMonth.getMonth() && aDate.getFullYear() === thisMonth.getFullYear();
    });

    const totalMermas = currentMonthAdjustments
      .filter(a => a.type === 'merma')
      .reduce((sum, a) => sum + Math.abs(a.quantity), 0);

    return `
      <div class="p-8 max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">🔄 Mermas y Ajustes</h1>
            <p class="text-white/50">Registro de pérdidas, vencimientos y ajustes de stock</p>
          </div>
          <div class="flex items-center gap-3">
            <select id="store-filter" class="form-select bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
              <option value="all">Todos los locales</option>
              ${App.state.stores.map(store => `
                <option value="${store.id}">${store.name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-2 gap-4 mb-8">
          <div class="kpi-card bg-white/5 border border-white/10 rounded-lg p-6">
            <div class="kpi-label text-white/50 text-sm mb-2">Total mermas este mes</div>
            <div class="kpi-value text-3xl font-bold text-orange-400">${totalMermas.toFixed(1)}</div>
          </div>
          <div class="kpi-card bg-white/5 border border-white/10 rounded-lg p-6">
            <div class="kpi-label text-white/50 text-sm mb-2">Registros totales</div>
            <div class="kpi-value text-3xl font-bold text-orange-400">${currentMonthAdjustments.length}</div>
          </div>
        </div>

        <!-- New Adjustment Button -->
        <div class="mb-8">
          <button id="new-adjustment-btn" class="btn btn-primary">
            + Registrar merma
          </button>
        </div>

        <!-- Adjustments Table -->
        <div class="card">
          <div class="card-header">
            <h2 class="text-2xl font-bold text-white">Historial de registros</h2>
          </div>
          <div class="card-content">
            ${this.state.adjustments.length > 0 ? `
              <div class="data-table">
                <table class="w-full text-sm">
                  <thead class="border-b border-white/10">
                    <tr class="text-white/70">
                      <th class="text-left py-3 px-4">Fecha</th>
                      <th class="text-left py-3 px-4">Producto</th>
                      <th class="text-left py-3 px-4">Local</th>
                      <th class="text-left py-3 px-4">Tipo</th>
                      <th class="text-left py-3 px-4">Cantidad</th>
                      <th class="text-left py-3 px-4">Motivo</th>
                      <th class="text-right py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.state.adjustments.map(adjustment => {
                      const store = App.state.stores.find(s => s.id === adjustment.storeId);
                      const product = App.state.products?.find(p => p.id === adjustment.productId);

                      let typeColor = 'badge-error';
                      if (adjustment.type === 'ajuste') typeColor = 'badge-default';
                      else if (adjustment.type === 'transferencia') typeColor = 'badge-blue';
                      else if (adjustment.type === 'vencimiento' || adjustment.type === 'rotura') typeColor = 'badge-warning';

                      return `
                        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td class="py-3 px-4 text-white">${App.formatDate(adjustment.date)}</td>
                          <td class="py-3 px-4 text-white/70">${product ? product.name : 'Desconocido'}</td>
                          <td class="py-3 px-4 text-white/70">${store ? store.name : 'Desconocido'}</td>
                          <td class="py-3 px-4">
                            <span class="badge ${typeColor}">
                              ${adjustment.type === 'merma' ? 'Merma' :
                                adjustment.type === 'ajuste' ? 'Ajuste' :
                                adjustment.type === 'rotura' ? 'Rotura' :
                                adjustment.type === 'vencimiento' ? 'Vencimiento' : 'Transferencia'}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-white">
                            <span class="${adjustment.quantity < 0 ? 'text-red-400' : 'text-green-400'}">
                              ${adjustment.quantity > 0 ? '+' : ''}${adjustment.quantity}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-white/50 text-xs">${adjustment.reason || '-'}</td>
                          <td class="py-3 px-4 text-right">
                            <button class="text-red-400 hover:text-red-300 text-sm" onclick="MermasPage.deleteAdjustment('${adjustment.id}')">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="text-center py-12">
                <p class="text-white/50">No hay mermas registradas aún</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('new-adjustment-btn').addEventListener('click', () => {
      this.openNewAdjustmentModal();
    });

    document.getElementById('store-filter').addEventListener('change', (e) => {
      this.state.selectedStore = e.target.value;
      this.render();
    });
  },

  openNewAdjustmentModal() {
    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Registrar Merma / Ajuste</h2>

        <form id="adjustment-form" class="space-y-6">
          <!-- Store -->
          <div>
            <label class="form-label text-gray-700">Local *</label>
            <select id="adj-store" class="form-select w-full" required>
              <option value="">-- Seleccionar local --</option>
              ${App.state.stores.map(store => `
                <option value="${store.id}">${store.name}</option>
              `).join('')}
            </select>
          </div>

          <!-- Product -->
          <div>
            <label class="form-label text-gray-700">Producto *</label>
            <select id="adj-product" class="form-select w-full" required>
              <option value="">-- Seleccionar producto --</option>
              ${(App.state.products || []).map(product => `
                <option value="${product.id}">${product.name}</option>
              `).join('')}
            </select>
          </div>

          <!-- Date -->
          <div>
            <label class="form-label text-gray-700">Fecha</label>
            <input type="date" id="adj-date" class="form-input w-full" value="${App.todayStr()}" required>
          </div>

          <!-- Quantity -->
          <div>
            <label class="form-label text-gray-700">Cantidad *</label>
            <input type="number" id="adj-qty" class="form-input w-full" placeholder="Negativo para pérdidas, positivo para devoluciones" step="0.01" required>
          </div>

          <!-- Type -->
          <div>
            <label class="form-label text-gray-700">Tipo *</label>
            <select id="adj-type" class="form-select w-full" required>
              <option value="merma">Merma</option>
              <option value="ajuste">Ajuste</option>
              <option value="rotura">Rotura</option>
              <option value="vencimiento">Vencimiento</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <!-- Reason -->
          <div>
            <label class="form-label text-gray-700">Motivo</label>
            <input type="text" id="adj-reason" class="form-input w-full" placeholder="Ej: Vencido, Rotura, Error de conteo...">
          </div>

          <!-- Notes -->
          <div>
            <label class="form-label text-gray-700">Notas (opcional)</label>
            <textarea id="adj-notes" class="form-input w-full h-20" placeholder="Anotaciones adicionales..."></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 justify-end pt-4 border-t">
            <button type="button" data-close-modal class="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal(html);

    document.getElementById('adjustment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveAdjustment();
    });
  },

  async saveAdjustment() {
    const storeId = document.getElementById('adj-store').value;
    const productId = document.getElementById('adj-product').value;
    const date = document.getElementById('adj-date').value;
    const quantity = parseFloat(document.getElementById('adj-qty').value);
    const type = document.getElementById('adj-type').value;
    const reason = document.getElementById('adj-reason').value;
    const notes = document.getElementById('adj-notes').value;

    if (!storeId || !productId || !date || !quantity) {
      App.toast('Completa todos los campos requeridos', 'warning');
      return;
    }

    try {
      await App.api('/api/stock_ajustes.php', {
        method: 'POST',
        body: JSON.stringify({
          storeId,
          productId,
          date,
          quantity,
          type,
          reason,
          notes,
        }),
      });

      App.closeModal();
      App.toast('Merma registrada exitosamente', 'success');
      await this.loadData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error saving adjustment:', error);
      App.toast('Error al guardar registro', 'error');
    }
  },

  async deleteAdjustment(id) {
    if (!App.confirm('¿Eliminar este registro de merma?')) {
      return;
    }

    try {
      await App.api(`/api/stock_ajustes.php?id=${id}`, { method: 'DELETE' });
      App.toast('Registro eliminado', 'success');
      await this.loadData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error deleting adjustment:', error);
      App.toast('Error eliminando registro', 'error');
    }
  },
};
