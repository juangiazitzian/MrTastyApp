const EerrPage = {
  state: {
    selectedMonth: null,
    selectedYear: null,
    selectedStore: 'all',
    data: null,
    mappings: [],
    loading: true,
    activeTab: 'mercaderia'
  },

  async render() {
    // Initialize defaults
    const now = new Date();
    this.state.selectedMonth = this.state.selectedMonth || now.getMonth() + 1;
    this.state.selectedYear = this.state.selectedYear || now.getFullYear();

    // Render skeleton
    document.getElementById('page-content').innerHTML = `
      <div class="page-header mb-6">
        <div class="page-title-group">
          <h1 class="page-title">📊 EERR</h1>
          <p class="page-description">Estado de Resultado mensual</p>
        </div>
        <button class="btn btn-primary" id="btn-export-csv">
          <span>📥</span> Exportar CSV
        </button>
      </div>

      <div class="skeleton" style="height: 100px; margin-bottom: 24px;"></div>
      <div class="skeleton" style="height: 400px;"></div>
    `;

    // Load data
    await this.loadData();
  },

  async loadData() {
    try {
      this.state.loading = true;

      // Fetch both data and mappings in parallel
      const [dataResponse, mappingsResponse] = await Promise.all([
        App.api(`/api/eerr.php?month=${this.state.selectedMonth}&year=${this.state.selectedYear}&storeId=${this.state.selectedStore}`),
        App.api('/api/eerr.php?action=mappings')
      ]);

      this.state.data = dataResponse;
      this.state.mappings = mappingsResponse.mappings || [];

      this.renderPage();
      this.state.loading = false;
    } catch (error) {
      console.error('Error loading EERR:', error);
      App.toast('Error cargando EERR', 'error');
    }
  },

  renderPage() {
    const stores = App.state.stores || [];
    const months = App.monthNames;
    const currentYear = new Date().getFullYear();
    const data = this.state.data || {};

    const kpiRow = `
      <div class="grid grid-1 sm:grid-2 lg:grid-4 gap-4 mb-6">
        <div class="kpi-card">
          <div class="kpi-label">Ventas</div>
          <div class="kpi-value">${App.formatCurrency(data.sales_total || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Gastos</div>
          <div class="kpi-value">${App.formatCurrency(data.expense_total || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Utilidad</div>
          <div class="kpi-value">${App.formatCurrency(data.profit || 0)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">% Utilidad</div>
          <div class="kpi-value">${(data.profit_percentage || 0).toFixed(1)}%</div>
        </div>
      </div>
    `;

    // Build sections content
    const sections = data.sections || [];
    const mercaderiaSection = sections.find(s => s.section === 'MERCADERIA');

    let mercaderiaHTML = '';
    if (mercaderiaSection) {
      const items = mercaderiaSection.items || [];
      mercaderiaHTML = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th style="text-align: right;">Total</th>
                <th style="text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td>${item.category}</td>
                  <td style="text-align: right; font-weight: 600;">${App.formatCurrency(item.total)}</td>
                  <td style="text-align: center;">
                    <button class="btn btn-sm btn-ghost edit-entry" data-category="${item.category}" title="Editar">✏️</button>
                  </td>
                </tr>
              `).join('')}
              <tr style="border-top: 2px solid hsl(25, 8%, 20%); font-weight: 600;">
                <td>TOTAL MERCADERÍA</td>
                <td style="text-align: right;">${App.formatCurrency(mercaderiaSection.total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    let allSectionsHTML = '';
    sections.forEach(section => {
      const items = section.items || [];
      allSectionsHTML += `
        <div class="card mb-4">
          <div class="card-header" style="padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 16px; font-weight: 600; color: white; margin: 0;">${section.section}</h3>
              <span style="font-size: 14px; font-weight: 600; color: #fb923c;">${App.formatCurrency(section.total)}</span>
            </div>
          </div>
          <div class="card-content">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td>${item.category}</td>
                      <td style="text-align: right;">${App.formatCurrency(item.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    });

    let mappingHTML = '';
    const suppliers = App.state.suppliers || [];
    mappingHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Categoría EERR</th>
              <th style="text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(supplier => {
              const mapping = this.state.mappings.find(m => m.supplier_id === supplier.id);
              return `
                <tr>
                  <td>${supplier.name}</td>
                  <td>
                    <select class="form-input form-select mapping-select" data-supplier-id="${supplier.id}" style="max-width: 300px;">
                      <option value="">Sin mapeo</option>
                      <option value="Verduleria" ${mapping?.eerr_category === 'Verduleria' ? 'selected' : ''}>Verduleria</option>
                      <option value="Huevos" ${mapping?.eerr_category === 'Huevos' ? 'selected' : ''}>Huevos</option>
                      <option value="Aceite" ${mapping?.eerr_category === 'Aceite' ? 'selected' : ''}>Aceite</option>
                      <option value="CDP" ${mapping?.eerr_category === 'CDP' ? 'selected' : ''}>CDP</option>
                      <option value="The Bread Box" ${mapping?.eerr_category === 'The Bread Box' ? 'selected' : ''}>The Bread Box</option>
                      <option value="Coca Cola" ${mapping?.eerr_category === 'Coca Cola' ? 'selected' : ''}>Coca Cola</option>
                      <option value="Blanca Luna" ${mapping?.eerr_category === 'Blanca Luna' ? 'selected' : ''}>Blanca Luna</option>
                      <option value="TODO ENVASES" ${mapping?.eerr_category === 'TODO ENVASES' ? 'selected' : ''}>TODO ENVASES</option>
                      <option value="Papelería" ${mapping?.eerr_category === 'Papelería' ? 'selected' : ''}>Papelería</option>
                    </select>
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-sm btn-primary save-mapping" data-supplier-id="${supplier.id}">Guardar</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    const html = `
      <div class="page-header mb-6">
        <div class="page-title-group">
          <h1 class="page-title">📊 EERR</h1>
          <p class="page-description">Estado de Resultado mensual</p>
        </div>
        <button class="btn btn-primary" id="btn-export-csv">
          <span>📥</span> Exportar CSV
        </button>
      </div>

      <!-- Filters -->
      <div class="card card-content mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="form-label">Mes</label>
            <select class="form-input form-select" id="filter-month">
              ${App.monthNames.map((m, i) => `<option value="${i + 1}" ${(i + 1) === this.state.selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Año</label>
            <select class="form-input form-select" id="filter-year">
              ${[currentYear - 1, currentYear, currentYear + 1].map(y => `<option value="${y}" ${y === this.state.selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Local</label>
            <select class="form-input form-select" id="filter-store">
              <option value="all">Todos los locales</option>
              ${stores.map(s => `<option value="${s.id}" ${s.id === this.state.selectedStore ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      ${kpiRow}

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab active" data-tab="mercaderia">📦 Detalle MERCADERÍA</button>
        <button class="tab" data-tab="sections">📋 Todas las secciones</button>
        <button class="tab" data-tab="mappings">🔗 Mapeo proveedores</button>
      </div>

      <!-- Tab Content -->
      <div id="tab-content">
        <!-- Tab: MERCADERÍA Detail -->
        <div id="tab-mercaderia" class="tab-pane active">
          <div class="card card-content">
            ${mercaderiaHTML}
          </div>
        </div>

        <!-- Tab: All Sections -->
        <div id="tab-sections" class="tab-pane hidden">
          ${allSectionsHTML}
        </div>

        <!-- Tab: Supplier Mapping -->
        <div id="tab-mappings" class="tab-pane hidden">
          <div class="card card-content">
            ${mappingHTML}
          </div>
        </div>
      </div>
    `;

    document.getElementById('page-content').innerHTML = html;

    // Bind events
    this.bindEvents();
  },

  bindEvents() {
    // Filter changes
    document.getElementById('filter-month').addEventListener('change', (e) => {
      this.state.selectedMonth = parseInt(e.target.value);
      this.loadData();
    });

    document.getElementById('filter-year').addEventListener('change', (e) => {
      this.state.selectedYear = parseInt(e.target.value);
      this.loadData();
    });

    document.getElementById('filter-store').addEventListener('change', (e) => {
      this.state.selectedStore = e.target.value;
      this.loadData();
    });

    // Tab switching
    document.querySelectorAll('.tabs .tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Edit entry buttons
    document.querySelectorAll('.edit-entry').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = btn.dataset.category;
        this.openEditEntryModal(category);
      });
    });

    // Mapping save buttons
    document.querySelectorAll('.save-mapping').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const supplierId = btn.dataset.supplierId;
        const select = document.querySelector(`.mapping-select[data-supplier-id="${supplierId}"]`);
        const eerrCategory = select.value;

        if (!eerrCategory) {
          App.toast('Selecciona una categoría', 'warning');
          return;
        }

        await this.saveMapping(supplierId, eerrCategory);
      });
    });

    // Export CSV button
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      this.exportCSV();
    });
  },

  switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.add('hidden');
    });

    // Remove active class from buttons
    document.querySelectorAll('.tabs .tab').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show selected tab
    const pane = document.getElementById(`tab-${tabName}`);
    if (pane) {
      pane.classList.remove('hidden');
    }

    // Mark button as active
    document.querySelector(`.tabs .tab[data-tab="${tabName}"]`)?.classList.add('active');

    this.state.activeTab = tabName;
  },

  openEditEntryModal(category) {
    const html = `
      <div class="modal-header">
        <h2 class="modal-title">Editar ${category}</h2>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <input type="text" class="form-input" disabled value="${category}" />
        </div>

        <div class="form-group">
          <label class="form-label">Monto Manual</label>
          <input type="number" class="form-input" id="entry-amount" step="0.01" value="0" placeholder="Monto a adicionar" />
        </div>

        <div class="form-group">
          <label class="form-label">Notas</label>
          <textarea class="form-input" id="entry-notes" placeholder="Notas adicionales"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-entry">Guardar</button>
      </div>
    `;

    App.openModal(html);

    document.getElementById('btn-save-entry').addEventListener('click', async () => {
      const amount = parseFloat(document.getElementById('entry-amount').value) || 0;
      const notes = document.getElementById('entry-notes').value;

      // Create date string for the current month/year
      const year = this.state.selectedYear;
      const month = String(this.state.selectedMonth).padStart(2, '0');
      const date = `${year}-${month}-01`;

      try {
        await this.saveManualEntry(category, amount, date, notes);
        App.closeModal();
      } catch (error) {
        console.error('Save entry error:', error);
        App.toast('Error guardando entrada', 'error');
      }
    });
  },

  async saveMapping(supplierId, eerrCategory) {
    try {
      await App.api('/api/eerr.php', {
        method: 'PUT',
        body: {
          supplier_id: supplierId,
          eerr_category: eerrCategory
        }
      });

      App.toast('Mapeo guardado', 'success');
      await this.loadData();
    } catch (error) {
      console.error('Save mapping error:', error);
      App.toast('Error guardando mapeo', 'error');
    }
  },

  async saveManualEntry(category, amount, date, notes) {
    try {
      await App.api('/api/eerr.php', {
        method: 'PUT',
        body: {
          action: 'entries',
          entries: [
            {
              store_id: this.state.selectedStore === 'all' ? '' : this.state.selectedStore,
              category: category,
              date: date,
              amount: amount,
              notes: notes
            }
          ]
        }
      });

      App.toast('Entrada guardada', 'success');
      await this.loadData();
    } catch (error) {
      console.error('Save entry error:', error);
      App.toast('Error guardando entrada', 'error');
    }
  },

  exportCSV() {
    const month = String(this.state.selectedMonth).padStart(2, '0');
    const year = this.state.selectedYear;
    const storeId = this.state.selectedStore === 'all' ? '' : this.state.selectedStore;

    const url = `/api/eerr_export.php?month=${month}&year=${year}&storeId=${storeId}&format=csv`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `EERR_${month}_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    App.toast('Descargando CSV...', 'success');
  }
};

// Add CSS for hidden class and tab panes if not already present
const style = document.createElement('style');
style.textContent = `
  .hidden {
    display: none !important;
  }

  .tab-pane {
    display: block;
    animation: fadeIn 0.2s ease;
  }

  .tab-pane.hidden {
    display: none;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
if (!document.querySelector('style[data-eerr-styles]')) {
  style.setAttribute('data-eerr-styles', 'true');
  document.head.appendChild(style);
}
