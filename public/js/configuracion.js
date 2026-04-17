// Mr Tasty App - Configuration Page
// CRUD for stores, suppliers, products, and delivery settings

const ConfiguracionPage = {
  state: {
    activeTab: 'locales',
    stores: [],
    suppliers: [],
    products: [],
    settings: null,
    loading: true,
  },

  async render() {
    const pageContent = document.getElementById('page-content');

    this.state.loading = true;
    pageContent.innerHTML = `<div class="p-8"><div class="text-white/50">Cargando configuración...</div></div>`;

    await this.loadAllData();
    pageContent.innerHTML = this.getHTML();
    this.bindEvents();
  },

  async loadAllData() {
    try {
      const [storesRes, suppliersRes, productsRes, settingsRes] = await Promise.all([
        App.api('/api/stores.php'),
        App.api('/api/suppliers.php'),
        App.api('/api/products.php'),
        App.api('/api/settings.php'),
      ]);

      this.state.stores = storesRes.stores || [];
      this.state.suppliers = suppliersRes.suppliers || [];
      this.state.products = productsRes.products || [];
      this.state.settings = settingsRes.settings || {};

      // Update App state
      App.state.stores = this.state.stores;
      App.state.suppliers = this.state.suppliers;
      App.state.products = this.state.products;

      this.state.loading = false;
    } catch (error) {
      console.error('Error loading configuration data:', error);
      this.state.loading = false;
      App.toast('Error cargando configuración', 'error');
    }
  },

  getHTML() {
    return `
      <div class="p-8 max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="flex items-center gap-3 mb-8">
          <h1 class="text-4xl font-bold text-white">⚙️ Configuración</h1>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 mb-8 border-b border-white/10 overflow-x-auto pb-4">
          <button class="tab-btn ${this.state.activeTab === 'locales' ? 'tab-active' : ''}" data-tab="locales">
            Locales
          </button>
          <button class="tab-btn ${this.state.activeTab === 'proveedores' ? 'tab-active' : ''}" data-tab="proveedores">
            Proveedores
          </button>
          <button class="tab-btn ${this.state.activeTab === 'productos' ? 'tab-active' : ''}" data-tab="productos">
            Productos
          </button>
          <button class="tab-btn ${this.state.activeTab === 'delivery' ? 'tab-active' : ''}" data-tab="delivery">
            Configuración Delivery
          </button>
        </div>

        <!-- Tab Content -->
        <div id="tab-content">
          ${this.renderTabContent()}
        </div>
      </div>

      <style>
        .tab-btn {
          padding: 0.75rem 1.5rem;
          color: #ffffff80;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tab-btn:hover {
          color: #ffffffcc;
        }
        .tab-btn.tab-active {
          color: #f97316;
          border-bottom-color: #f97316;
        }
      </style>
    `;
  },

  renderTabContent() {
    switch (this.state.activeTab) {
      case 'locales':
        return this.renderLocalesTab();
      case 'proveedores':
        return this.renderProveedoresTab();
      case 'productos':
        return this.renderProductosTab();
      case 'delivery':
        return this.renderDeliveryTab();
      default:
        return '';
    }
  },

  renderLocalesTab() {
    return `
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h2 class="text-2xl font-bold text-white">Locales</h2>
          <button id="new-store-btn" class="btn btn-sm btn-primary">
            + Agregar local
          </button>
        </div>
        <div class="card-content">
          ${this.state.stores.length > 0 ? `
            <div class="data-table">
              <table class="w-full text-sm">
                <thead class="border-b border-white/10">
                  <tr class="text-white/70">
                    <th class="text-left py-3 px-4">Nombre</th>
                    <th class="text-left py-3 px-4">Dirección</th>
                    <th class="text-left py-3 px-4">Estado</th>
                    <th class="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.stores.map(store => `
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td class="py-3 px-4 text-white font-medium">${store.name}</td>
                      <td class="py-3 px-4 text-white/70">${store.address || '-'}</td>
                      <td class="py-3 px-4">
                        <span class="badge badge-success">Activo</span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <button class="text-orange-400 hover:text-orange-300 text-sm mr-3" onclick="ConfiguracionPage.openStoreModal('${store.id}')">
                          Editar
                        </button>
                        <button class="text-red-400 hover:text-red-300 text-sm" onclick="ConfiguracionPage.deleteStore('${store.id}')">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center py-12">
              <p class="text-white/50 mb-4">No hay locales registrados</p>
              <button id="new-store-btn-empty" class="btn btn-primary" onclick="ConfiguracionPage.openStoreModal()">
                Crear primer local
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderProveedoresTab() {
    return `
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h2 class="text-2xl font-bold text-white">Proveedores</h2>
          <button id="new-supplier-btn" class="btn btn-sm btn-primary">
            + Agregar proveedor
          </button>
        </div>
        <div class="card-content">
          ${this.state.suppliers.length > 0 ? `
            <div class="data-table overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-white/10">
                  <tr class="text-white/70">
                    <th class="text-left py-3 px-4">Nombre</th>
                    <th class="text-left py-3 px-4">Categoría</th>
                    <th class="text-left py-3 px-4">Etiqueta EERR</th>
                    <th class="text-center py-3 px-4">Blancaluna</th>
                    <th class="text-left py-3 px-4 min-w-40">Aliases</th>
                    <th class="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.suppliers.map(supplier => `
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td class="py-3 px-4 text-white font-medium">${supplier.name}</td>
                      <td class="py-3 px-4 text-white/70">${supplier.category || '-'}</td>
                      <td class="py-3 px-4 text-white/70 text-xs">${supplier.eerrLabel || '-'}</td>
                      <td class="py-3 px-4 text-center">
                        ${supplier.isBlancaluna ? '<span class="text-green-400">✓</span>' : '-'}
                      </td>
                      <td class="py-3 px-4 text-white/50 text-xs">
                        ${supplier.aliases && supplier.aliases.length > 0
                          ? supplier.aliases.join(', ')
                          : '-'}
                      </td>
                      <td class="py-3 px-4 text-right">
                        <button class="text-orange-400 hover:text-orange-300 text-sm mr-3" onclick="ConfiguracionPage.openSupplierModal('${supplier.id}')">
                          Editar
                        </button>
                        <button class="text-red-400 hover:text-red-300 text-sm" onclick="ConfiguracionPage.deleteSupplier('${supplier.id}')">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center py-12">
              <p class="text-white/50 mb-4">No hay proveedores registrados</p>
              <button class="btn btn-primary" onclick="ConfiguracionPage.openSupplierModal()">
                Crear primer proveedor
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderProductosTab() {
    return `
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h2 class="text-2xl font-bold text-white">Productos</h2>
          <button id="new-product-btn" class="btn btn-sm btn-primary">
            + Agregar producto
          </button>
        </div>
        <div class="card-content">
          ${this.state.products.length > 0 ? `
            <div class="data-table overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-white/10">
                  <tr class="text-white/70">
                    <th class="text-left py-3 px-4">Nombre</th>
                    <th class="text-left py-3 px-4">Unidad</th>
                    <th class="text-right py-3 px-4">Pack</th>
                    <th class="text-right py-3 px-4">Stock seguridad</th>
                    <th class="text-right py-3 px-4">Redondeo</th>
                    <th class="text-left py-3 px-4 min-w-40">Aliases</th>
                    <th class="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.state.products.map(product => `
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td class="py-3 px-4 text-white font-medium">${product.name}</td>
                      <td class="py-3 px-4 text-white/70">${product.unit}</td>
                      <td class="py-3 px-4 text-right text-white/70">${product.packSize || '-'}</td>
                      <td class="py-3 px-4 text-right text-orange-400">${product.safetyStock || '-'}</td>
                      <td class="py-3 px-4 text-right text-white/70">${product.roundingUnit || '-'}</td>
                      <td class="py-3 px-4 text-white/50 text-xs">
                        ${product.aliases && product.aliases.length > 0
                          ? product.aliases.join(', ')
                          : '-'}
                      </td>
                      <td class="py-3 px-4 text-right">
                        <button class="text-orange-400 hover:text-orange-300 text-sm mr-3" onclick="ConfiguracionPage.openProductModal('${product.id}')">
                          Editar
                        </button>
                        <button class="text-red-400 hover:text-red-300 text-sm" onclick="ConfiguracionPage.deleteProduct('${product.id}')">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center py-12">
              <p class="text-white/50 mb-4">No hay productos registrados</p>
              <button class="btn btn-primary" onclick="ConfiguracionPage.openProductModal()">
                Crear primer producto
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderDeliveryTab() {
    const schedule = this.state.settings?.delivery_schedule || {};
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const orderDays = [1, 3, 5]; // Mon, Wed, Fri

    return `
      <div class="space-y-6">
        <!-- Delivery Schedule -->
        <div class="card">
          <div class="card-header">
            <h2 class="text-2xl font-bold text-white">Calendario de entregas</h2>
          </div>
          <div class="card-content">
            <div class="grid gap-6">
              ${orderDays.map(dayNum => {
                const daySchedule = schedule[dayNum] || { coverageDays: 3, label: dayNames[dayNum] };
                return `
                  <div class="bg-white/5 rounded-lg p-6 border border-white/10">
                    <div class="mb-4">
                      <h3 class="text-lg font-semibold text-white mb-4">${dayNames[dayNum]}</h3>
                      <div class="space-y-4">
                        <div>
                          <label class="form-label text-white/70 mb-2 block">Días de cobertura</label>
                          <input type="number"
                            class="form-input w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            id="coverage-${dayNum}"
                            value="${daySchedule.coverageDays}"
                            min="1"
                            max="14">
                        </div>
                        <div>
                          <label class="form-label text-white/70 mb-2 block">Etiqueta/Nombre</label>
                          <input type="text"
                            class="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            id="label-${dayNum}"
                            value="${daySchedule.label}"
                            placeholder="Ej: Blancaluna ${dayNames[dayNum]}">
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="pt-6 border-t border-white/10 mt-6">
              <button id="save-delivery-btn" class="btn btn-primary">
                💾 Guardar configuración
              </button>
            </div>
          </div>
        </div>

        <!-- API Settings -->
        <div class="card">
          <div class="card-header">
            <h2 class="text-2xl font-bold text-white">Configuración API</h2>
          </div>
          <div class="card-content">
            <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <p class="text-white/70 text-sm">
                <strong>Nota:</strong> La clave API de Anthropic se utiliza para la extracción de texto de imágenes (OCR) al subir fotos de stock.
                Sin esta clave, las fotos se procesarán con un sistema básico.
              </p>
            </div>

            <div>
              <label class="form-label text-white/70 mb-2 block">ANTHROPIC_API_KEY</label>
              <input type="password"
                class="form-input w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                id="api-key-input"
                placeholder="sk-ant-..."
                value="">
              <p class="text-white/40 text-xs mt-2">
                Para obtener una clave, visita: <a href="https://console.anthropic.com" target="_blank" class="text-orange-400 hover:underline">console.anthropic.com</a>
              </p>
            </div>

            <div class="pt-6 border-t border-white/10 mt-6">
              <button id="save-api-key-btn" class="btn btn-primary">
                💾 Guardar clave API
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.state.activeTab = btn.dataset.tab;
        const tabContent = document.getElementById('tab-content');
        tabContent.innerHTML = this.renderTabContent();

        // Re-bind events for new content
        this.bindTabEvents();
      });
    });

    this.bindTabEvents();
  },

  bindTabEvents() {
    // Stores
    const newStoreBtn = document.getElementById('new-store-btn');
    if (newStoreBtn) {
      newStoreBtn.addEventListener('click', () => this.openStoreModal());
    }

    // Suppliers
    const newSupplierBtn = document.getElementById('new-supplier-btn');
    if (newSupplierBtn) {
      newSupplierBtn.addEventListener('click', () => this.openSupplierModal());
    }

    // Products
    const newProductBtn = document.getElementById('new-product-btn');
    if (newProductBtn) {
      newProductBtn.addEventListener('click', () => this.openProductModal());
    }

    // Delivery settings
    const saveDeliveryBtn = document.getElementById('save-delivery-btn');
    if (saveDeliveryBtn) {
      saveDeliveryBtn.addEventListener('click', () => this.saveDeliverySchedule());
    }

    // API Key
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    if (saveApiKeyBtn) {
      saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
    }
  },

  // CRUD Operations

  openStoreModal(storeId = null) {
    const store = storeId ? this.state.stores.find(s => s.id === storeId) : null;

    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          ${store ? 'Editar local' : 'Nuevo local'}
        </h2>

        <form id="store-form" class="space-y-6">
          <div>
            <label class="form-label text-gray-700">Nombre *</label>
            <input type="text"
              class="form-input w-full"
              id="store-name"
              value="${store ? store.name : ''}"
              placeholder="Ej: San Miguel - Balcarce"
              required>
          </div>

          <div>
            <label class="form-label text-gray-700">Dirección</label>
            <input type="text"
              class="form-input w-full"
              id="store-address"
              value="${store ? store.address || '' : ''}"
              placeholder="Ej: Av. San Martín 123">
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t">
            <button type="button" data-close-modal class="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              ${store ? 'Actualizar local' : 'Crear local'}
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal(html);

    document.getElementById('store-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('store-name').value;
      const address = document.getElementById('store-address').value;

      try {
        const method = store ? 'PUT' : 'POST';
        const body = { name, address };
        if (store) body.id = store.id;

        await App.api('/api/stores.php', {
          method,
          body: JSON.stringify(body),
        });

        App.closeModal();
        App.toast(store ? 'Local actualizado' : 'Local creado', 'success');
        await this.loadAllData();
        this.state.activeTab = 'locales';
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = this.getHTML();
        this.bindEvents();
      } catch (error) {
        console.error('Error saving store:', error);
        App.toast('Error guardando local', 'error');
      }
    });
  },

  async deleteStore(storeId) {
    if (!App.confirm('¿Eliminar este local? Se perderán todos los datos asociados.')) {
      return;
    }

    try {
      await App.api(`/api/stores.php?id=${storeId}`, { method: 'DELETE' });
      App.toast('Local eliminado', 'success');
      await this.loadAllData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error deleting store:', error);
      App.toast('Error eliminando local', 'error');
    }
  },

  openSupplierModal(supplierId = null) {
    const supplier = supplierId ? this.state.suppliers.find(s => s.id === supplierId) : null;

    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl max-h-96 overflow-y-auto">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          ${supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
        </h2>

        <form id="supplier-form" class="space-y-6">
          <div>
            <label class="form-label text-gray-700">Nombre *</label>
            <input type="text"
              class="form-input w-full"
              id="supplier-name"
              value="${supplier ? supplier.name : ''}"
              placeholder="Ej: Blancaluna"
              required>
          </div>

          <div>
            <label class="form-label text-gray-700">Categoría</label>
            <select id="supplier-category" class="form-select w-full">
              <option value="">-- Seleccionar --</option>
              <option value="MERCADERIA" ${supplier?.category === 'MERCADERIA' ? 'selected' : ''}>Mercadería</option>
              <option value="GASTOS_LOCAL" ${supplier?.category === 'GASTOS_LOCAL' ? 'selected' : ''}>Gastos local</option>
              <option value="OTRO" ${supplier?.category === 'OTRO' ? 'selected' : ''}>Otro</option>
            </select>
          </div>

          <div>
            <label class="form-label text-gray-700">Etiqueta EERR</label>
            <input type="text"
              class="form-input w-full"
              id="supplier-eerr"
              value="${supplier ? supplier.eerrLabel || '' : ''}"
              placeholder="Ej: OTROS_SUMINISTROS">
          </div>

          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                id="supplier-blancaluna"
                ${supplier?.isBlancaluna ? 'checked' : ''}
                class="w-4 h-4">
              <span class="text-gray-700">Es Blancaluna (proveedor principal)</span>
            </label>
          </div>

          <div>
            <label class="form-label text-gray-700 mb-2 block">Aliases (nombres alternativos)</label>
            <div id="aliases-list" class="space-y-2 mb-3">
              ${supplier && supplier.aliases && supplier.aliases.length > 0
                ? supplier.aliases.map((alias, idx) => `
                    <div class="flex gap-2">
                      <input type="text" class="form-input flex-1 alias-input" value="${alias}">
                      <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
                    </div>
                  `).join('')
                : ''}
            </div>
            <button type="button" id="add-alias-btn" class="btn btn-sm btn-ghost">
              + Agregar alias
            </button>
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t">
            <button type="button" data-close-modal class="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              ${supplier ? 'Actualizar proveedor' : 'Crear proveedor'}
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal(html);

    document.getElementById('add-alias-btn').addEventListener('click', (e) => {
      e.preventDefault();
      const aliasList = document.getElementById('aliases-list');
      const aliasDiv = document.createElement('div');
      aliasDiv.className = 'flex gap-2';
      aliasDiv.innerHTML = `
        <input type="text" class="form-input flex-1 alias-input" placeholder="Alias">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
      `;
      aliasList.appendChild(aliasDiv);
    });

    document.getElementById('supplier-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('supplier-name').value;
      const category = document.getElementById('supplier-category').value;
      const eerrLabel = document.getElementById('supplier-eerr').value;
      const isBlancaluna = document.getElementById('supplier-blancaluna').checked;

      const aliases = Array.from(document.querySelectorAll('.alias-input'))
        .map(input => input.value)
        .filter(val => val.trim());

      try {
        const method = supplier ? 'PUT' : 'POST';
        const body = { name, category, eerrLabel, isBlancaluna, aliases };
        if (supplier) body.id = supplier.id;

        await App.api('/api/suppliers.php', {
          method,
          body: JSON.stringify(body),
        });

        App.closeModal();
        App.toast(supplier ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
        await this.loadAllData();
        this.state.activeTab = 'proveedores';
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = this.getHTML();
        this.bindEvents();
      } catch (error) {
        console.error('Error saving supplier:', error);
        App.toast('Error guardando proveedor', 'error');
      }
    });
  },

  async deleteSupplier(supplierId) {
    if (!App.confirm('¿Eliminar este proveedor?')) {
      return;
    }

    try {
      await App.api(`/api/suppliers.php?id=${supplierId}`, { method: 'DELETE' });
      App.toast('Proveedor eliminado', 'success');
      await this.loadAllData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      App.toast('Error eliminando proveedor', 'error');
    }
  },

  openProductModal(productId = null) {
    const product = productId ? this.state.products.find(p => p.id === productId) : null;

    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl max-h-96 overflow-y-auto">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          ${product ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        <form id="product-form" class="space-y-6">
          <div>
            <label class="form-label text-gray-700">Nombre *</label>
            <input type="text"
              class="form-input w-full"
              id="product-name"
              value="${product ? product.name : ''}"
              placeholder="Ej: Queso Cremoso"
              required>
          </div>

          <div>
            <label class="form-label text-gray-700">Unidad de medida *</label>
            <select id="product-unit" class="form-select w-full" required>
              <option value="">-- Seleccionar --</option>
              <option value="unidad" ${product?.unit === 'unidad' ? 'selected' : ''}>Unidad</option>
              <option value="kg" ${product?.unit === 'kg' ? 'selected' : ''}>Kilogramo (kg)</option>
              <option value="litro" ${product?.unit === 'litro' ? 'selected' : ''}>Litro</option>
              <option value="pack" ${product?.unit === 'pack' ? 'selected' : ''}>Pack</option>
              <option value="caja" ${product?.unit === 'caja' ? 'selected' : ''}>Caja</option>
            </select>
          </div>

          <div>
            <label class="form-label text-gray-700">Tamaño de pack (opcional)</label>
            <input type="text"
              class="form-input w-full"
              id="product-pack"
              value="${product ? product.packSize || '' : ''}"
              placeholder="Ej: 500g, 1L">
          </div>

          <div>
            <label class="form-label text-gray-700">Stock de seguridad</label>
            <input type="number"
              class="form-input w-full"
              id="product-safety"
              value="${product ? product.safetyStock || 0 : 0}"
              step="0.01"
              min="0">
          </div>

          <div>
            <label class="form-label text-gray-700">Unidad de redondeo</label>
            <input type="number"
              class="form-input w-full"
              id="product-rounding"
              value="${product ? product.roundingUnit || 1 : 1}"
              step="0.1"
              min="0.1">
          </div>

          <div>
            <label class="form-label text-gray-700 mb-2 block">Aliases</label>
            <div id="prod-aliases-list" class="space-y-2 mb-3">
              ${product && product.aliases && product.aliases.length > 0
                ? product.aliases.map((alias, idx) => `
                    <div class="flex gap-2">
                      <input type="text" class="form-input flex-1 alias-input" value="${alias}">
                      <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
                    </div>
                  `).join('')
                : ''}
            </div>
            <button type="button" id="add-prod-alias-btn" class="btn btn-sm btn-ghost">
              + Agregar alias
            </button>
          </div>

          <div class="flex gap-3 justify-end pt-4 border-t">
            <button type="button" data-close-modal class="btn btn-outline">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              ${product ? 'Actualizar producto' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal(html);

    document.getElementById('add-prod-alias-btn').addEventListener('click', (e) => {
      e.preventDefault();
      const aliasList = document.getElementById('prod-aliases-list');
      const aliasDiv = document.createElement('div');
      aliasDiv.className = 'flex gap-2';
      aliasDiv.innerHTML = `
        <input type="text" class="form-input flex-1 alias-input" placeholder="Alias">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>
      `;
      aliasList.appendChild(aliasDiv);
    });

    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('product-name').value;
      const unit = document.getElementById('product-unit').value;
      const packSize = document.getElementById('product-pack').value;
      const safetyStock = parseFloat(document.getElementById('product-safety').value);
      const roundingUnit = parseFloat(document.getElementById('product-rounding').value);

      const aliases = Array.from(document.querySelectorAll('#prod-aliases-list .alias-input'))
        .map(input => input.value)
        .filter(val => val.trim());

      try {
        const method = product ? 'PUT' : 'POST';
        const body = { name, unit, packSize, safetyStock, roundingUnit, aliases };
        if (product) body.id = product.id;

        await App.api('/api/products.php', {
          method,
          body: JSON.stringify(body),
        });

        App.closeModal();
        App.toast(product ? 'Producto actualizado' : 'Producto creado', 'success');
        await this.loadAllData();
        this.state.activeTab = 'productos';
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = this.getHTML();
        this.bindEvents();
      } catch (error) {
        console.error('Error saving product:', error);
        App.toast('Error guardando producto', 'error');
      }
    });
  },

  async deleteProduct(productId) {
    if (!App.confirm('¿Eliminar este producto?')) {
      return;
    }

    try {
      await App.api(`/api/products.php?id=${productId}`, { method: 'DELETE' });
      App.toast('Producto eliminado', 'success');
      await this.loadAllData();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error deleting product:', error);
      App.toast('Error eliminando producto', 'error');
    }
  },

  async saveDeliverySchedule() {
    const schedule = {};
    const orderDays = [1, 3, 5];

    orderDays.forEach(dayNum => {
      const coverageDays = parseInt(document.getElementById(`coverage-${dayNum}`).value);
      const label = document.getElementById(`label-${dayNum}`).value;

      schedule[dayNum] = {
        coverageDays,
        label,
        coverageDayNumbers: this.calculateCoverageDays(dayNum, coverageDays),
      };
    });

    try {
      await App.api('/api/settings.php', {
        method: 'PUT',
        body: JSON.stringify({
          key: 'delivery_schedule',
          value: schedule,
        }),
      });

      App.toast('Configuración de entregas guardada', 'success');
    } catch (error) {
      console.error('Error saving delivery schedule:', error);
      App.toast('Error guardando configuración', 'error');
    }
  },

  calculateCoverageDays(startDay, days) {
    const result = [];
    for (let i = 0; i < days; i++) {
      result.push((startDay + i) % 7);
    }
    return result;
  },

  async saveApiKey() {
    const apiKey = document.getElementById('api-key-input').value;

    if (!apiKey.trim()) {
      App.toast('Ingresa una clave API válida', 'warning');
      return;
    }

    try {
      await App.api('/api/settings.php', {
        method: 'PUT',
        body: JSON.stringify({
          key: 'ANTHROPIC_API_KEY',
          value: apiKey,
        }),
      });

      App.toast('Clave API guardada correctamente', 'success');
    } catch (error) {
      console.error('Error saving API key:', error);
      App.toast('Error guardando clave API', 'error');
    }
  },
};
