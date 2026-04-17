const RemitosPage = {
  state: {
    remitos: [],
    filterMonth: null,
    filterYear: null,
    filterStore: 'all',
    filterSupplier: 'all',
    loading: true,
    // Modal states
    showUpload: false,
    parsedData: null,
    reviewForm: {
      storeId: '',
      supplierId: '',
      supplierRaw: '',
      noteNumber: '',
      date: '',
      total: 0,
      notes: '',
      items: []
    },
    batchRows: [],
  },

  async render() {
    // Set defaults
    const now = new Date();
    this.state.filterMonth = this.state.filterMonth || now.getMonth() + 1;
    this.state.filterYear = this.state.filterYear || now.getFullYear();

    // Render page
    const pageHTML = this.getHTML();
    document.getElementById('page-content').innerHTML = pageHTML;

    // Bind events
    this.bindEvents();

    // Load data
    await this.loadRemitos();
  },

  async loadRemitos() {
    try {
      this.state.loading = true;

      const params = new URLSearchParams();
      if (this.state.filterMonth && this.state.filterYear) {
        params.append('month', this.state.filterMonth);
        params.append('year', this.state.filterYear);
      }
      if (this.state.filterStore !== 'all') {
        params.append('storeId', this.state.filterStore);
      }
      if (this.state.filterSupplier !== 'all') {
        params.append('supplierId', this.state.filterSupplier);
      }

      const response = await App.api(`/api/remitos.php?${params.toString()}`);
      this.state.remitos = response.remitos || [];

      this.renderTable();
      this.state.loading = false;
    } catch (error) {
      console.error('Error loading remitos:', error);
      App.toast('Error cargando remitos', 'error');
    }
  },

  getHTML() {
    const months = App.monthNames;
    const currentYear = new Date().getFullYear();
    const stores = App.state.stores || [];
    const suppliers = App.state.suppliers || [];

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">📋 Remitos</h1>
          <p class="page-description">Gestiona entregas de proveedores y carga de imágenes</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-outline" id="btn-batch">
            <span>📦</span> Batch
          </button>
          <button class="btn btn-outline" id="btn-manual">
            <span>➕</span> Manual
          </button>
          <label class="btn btn-primary cursor-pointer">
            <span>📸</span> Subir imagen
            <input type="file" id="file-upload" class="hidden" accept="image/*,.pdf" />
          </label>
        </div>
      </div>

      <!-- Filters -->
      <div class="card card-content mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="form-label">Mes</label>
            <select class="form-input form-select" id="filter-month">
              <option value="">Todos</option>
              ${months.map((m, i) => `<option value="${i + 1}" ${(i + 1) === this.state.filterMonth ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Año</label>
            <select class="form-input form-select" id="filter-year">
              <option value="">Todos</option>
              ${[currentYear - 1, currentYear, currentYear + 1].map(y => `<option value="${y}" ${y === this.state.filterYear ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Local</label>
            <select class="form-input form-select" id="filter-store">
              <option value="all">Todos los locales</option>
              ${stores.map(s => `<option value="${s.id}" ${s.id === this.state.filterStore ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Proveedor</label>
            <select class="form-input form-select" id="filter-supplier">
              <option value="all">Todos los proveedores</option>
              ${suppliers.map(s => `<option value="${s.id}" ${s.id === this.state.filterSupplier ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-1 sm:grid-2 lg:grid-4 gap-4 mb-6">
        <div class="kpi-card">
          <div class="kpi-label">Total Filtrado</div>
          <div class="kpi-value">${App.formatCurrency(this.state.remitos.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0))}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Promedio por Remito</div>
          <div class="kpi-value">${this.state.remitos.length > 0 ? App.formatCurrency(this.state.remitos.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0) / this.state.remitos.length) : '$0'}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Remitos</div>
          <div class="kpi-value">${this.state.remitos.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Proveedores</div>
          <div class="kpi-value">${new Set(this.state.remitos.map(r => r.supplier_id)).size}</div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="card" id="remitos-card">
        <div id="remitos-table-container">
          <!-- Table rendered here -->
        </div>
      </div>
    `;
  },

  renderTable() {
    const container = document.getElementById('remitos-table-container');

    if (this.state.remitos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">No hay remitos</div>
          <div class="empty-state-text">Carga remitos para comenzar a gestionar tus entregas</div>
          <div class="flex justify-center gap-2 mt-4">
            <button class="btn btn-outline" id="btn-empty-batch">📦 Carga batch</button>
            <button class="btn btn-primary" id="btn-empty-manual">➕ Cargar uno</button>
          </div>
        </div>
      `;

      document.getElementById('btn-empty-batch').addEventListener('click', () => this.openBatchModal());
      document.getElementById('btn-empty-manual').addEventListener('click', () => this.openManualModal());
      return;
    }

    const tableHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Local</th>
              <th>Nro</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: center;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.remitos.map(remito => `
              <tr>
                <td>${App.formatDate(remito.date)}</td>
                <td>${remito.supplier ? remito.supplier.name : '<span style="opacity:0.5">Sin proveedor</span>'}</td>
                <td><span class="badge badge-default">${remito.store ? remito.store.name : 'N/A'}</span></td>
                <td>${remito.note_number || '-'}</td>
                <td style="text-align: right; font-weight: 600;">${App.formatCurrency(remito.total)}</td>
                <td style="text-align: center;">
                  <button class="btn btn-sm btn-ghost edit-remito" data-id="${remito.id}" title="Editar">✏️</button>
                  <button class="btn btn-sm btn-ghost delete-remito" data-id="${remito.id}" data-label="${remito.supplier ? remito.supplier.name : 'Remito'}" title="Eliminar">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = tableHTML;

    // Bind row action buttons
    container.querySelectorAll('.edit-remito').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const remito = this.state.remitos.find(r => r.id === btn.dataset.id);
        if (remito) {
          this.state.reviewForm = {
            id: remito.id,
            storeId: remito.store_id,
            supplierId: remito.supplier_id,
            supplierRaw: remito.supplier?.name || '',
            noteNumber: remito.note_number || '',
            date: remito.date || '',
            total: remito.total || 0,
            notes: remito.notes || '',
            items: remito.items || []
          };
          this.openReviewModal(null, remito.image_url);
        }
      });
    });

    container.querySelectorAll('.delete-remito').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteRemito(btn.dataset.id, btn.dataset.label);
      });
    });
  },

  bindEvents() {
    // Filter events
    document.getElementById('filter-month').addEventListener('change', (e) => {
      this.state.filterMonth = e.target.value ? parseInt(e.target.value) : null;
      this.loadRemitos();
    });

    document.getElementById('filter-year').addEventListener('change', (e) => {
      this.state.filterYear = e.target.value ? parseInt(e.target.value) : null;
      this.loadRemitos();
    });

    document.getElementById('filter-store').addEventListener('change', (e) => {
      this.state.filterStore = e.target.value;
      this.loadRemitos();
    });

    document.getElementById('filter-supplier').addEventListener('change', (e) => {
      this.state.filterSupplier = e.target.value;
      this.loadRemitos();
    });

    // File upload
    document.getElementById('file-upload').addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleUpload(e.target.files[0]);
      }
    });

    // Action buttons
    document.getElementById('btn-batch').addEventListener('click', () => this.openBatchModal());
    document.getElementById('btn-manual').addEventListener('click', () => this.openManualModal());
  },

  async handleUpload(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'remito');

      App.toast('Subiendo y analizando imagen...', 'info');

      const response = await fetch('/api/upload.php', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;
      const parsed = data.parsed || { items: [], confidence: 0.5 };

      this.openReviewModal(parsed, imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      App.toast('Error subiendo archivo', 'error');
    }
  },

  openReviewModal(parsedData, imageUrl) {
    const stores = App.state.stores || [];
    const suppliers = App.state.suppliers || [];

    // Reset form if new entry
    if (parsedData) {
      this.state.reviewForm = {
        storeId: '',
        supplierId: '',
        supplierRaw: parsedData.supplierName || '',
        noteNumber: parsedData.noteNumber || '',
        date: parsedData.date || App.todayStr(),
        total: parsedData.total || 0,
        notes: '',
        items: parsedData.items || []
      };
    }

    const form = this.state.reviewForm;
    const confidence = parsedData?.confidence || 1;
    const lowConfidence = confidence < 0.7;

    let itemsHTML = '';
    (form.items || []).forEach((item, idx) => {
      itemsHTML += `
        <tr>
          <td><input type="text" class="form-input item-product" data-idx="${idx}" value="${item.productName || item.resolvedProductId ? item.productName || '' : ''}" placeholder="Producto" /></td>
          <td><input type="number" class="form-input item-qty" data-idx="${idx}" value="${item.quantity || 0}" step="0.01" placeholder="Cantidad" style="text-align: right;" /></td>
          <td><input type="number" class="form-input item-price" data-idx="${idx}" value="${item.unitPrice || 0}" step="0.01" placeholder="Precio" style="text-align: right;" /></td>
          <td style="text-align: right; font-weight: 600;">${App.formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}</td>
          <td><button type="button" class="btn btn-sm btn-ghost delete-item" data-idx="${idx}">🗑️</button></td>
        </tr>
      `;
    });

    const html = `
      <div class="modal-header">
        <h2 class="modal-title">Revisar Remito</h2>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="modal-body">
        ${imageUrl ? `<img src="${imageUrl}" style="max-width: 100%; max-height: 200px; margin-bottom: 16px; border-radius: 8px;" />` : ''}

        ${lowConfidence && parsedData ? `
          <div class="alert alert-warning mb-4">
            <span>⚠️</span>
            <div class="alert-content">
              <div class="alert-title">Baja confianza en la lectura</div>
              <div class="alert-text">Verifica los datos extraídos cuidadosamente</div>
            </div>
          </div>
        ` : ''}

        <form id="review-form">
          <div class="form-group">
            <label class="form-label">Local *</label>
            <select class="form-input form-select" id="form-store" required>
              <option value="">Selecciona un local</option>
              ${stores.map(s => `<option value="${s.id}" ${s.id === form.storeId ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Proveedor</label>
            <select class="form-input form-select" id="form-supplier">
              <option value="">Selecciona un proveedor</option>
              ${suppliers.map(s => `<option value="${s.id}" ${s.id === form.supplierId ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            ${form.supplierRaw ? `<small style="color: rgba(255,255,255,0.5); margin-top: 4px; display: block;">Detectado: ${form.supplierRaw}</small>` : ''}
          </div>

          <div class="grid grid-2 gap-4 mb-4">
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" class="form-input" id="form-date" value="${form.date}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nro de Remito</label>
              <input type="text" class="form-input" id="form-notenum" value="${form.noteNumber}" placeholder="Número del remito" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Total *</label>
            <input type="number" class="form-input" id="form-total" value="${form.total}" step="0.01" required />
          </div>

          <div class="form-group">
            <label class="form-label">Notas</label>
            <textarea class="form-input" id="form-notes" placeholder="Notas adicionales">${form.notes}</textarea>
          </div>

          <div style="margin-top: 20px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <label class="form-label">Ítems</label>
              <button type="button" class="btn btn-sm btn-outline" id="btn-add-item">+ Agregar</button>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="width: 120px;">Cantidad</th>
                    <th style="width: 120px;">Precio Unitario</th>
                    <th style="width: 120px; text-align: right;">Subtotal</th>
                    <th style="width: 40px;"></th>
                  </tr>
                </thead>
                <tbody id="items-tbody">
                  ${itemsHTML}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        ${!this.state.reviewForm.id ? `<button class="btn btn-outline" id="btn-save-new">Guardar y nuevo</button>` : ''}
        <button class="btn btn-primary" id="btn-save-remito">Guardar remito</button>
      </div>
    `;

    App.openModal(html);

    // Bind modal events
    const form = document.getElementById('review-form');
    document.getElementById('form-store').addEventListener('change', (e) => {
      this.state.reviewForm.storeId = e.target.value;
    });
    document.getElementById('form-supplier').addEventListener('change', (e) => {
      this.state.reviewForm.supplierId = e.target.value;
    });
    document.getElementById('form-date').addEventListener('change', (e) => {
      this.state.reviewForm.date = e.target.value;
    });
    document.getElementById('form-notenum').addEventListener('change', (e) => {
      this.state.reviewForm.noteNumber = e.target.value;
    });
    document.getElementById('form-total').addEventListener('change', (e) => {
      this.state.reviewForm.total = parseFloat(e.target.value) || 0;
    });
    document.getElementById('form-notes').addEventListener('change', (e) => {
      this.state.reviewForm.notes = e.target.value;
    });

    document.getElementById('btn-add-item').addEventListener('click', (e) => {
      e.preventDefault();
      if (!this.state.reviewForm.items) {
        this.state.reviewForm.items = [];
      }
      this.state.reviewForm.items.push({ productName: '', quantity: 0, unitPrice: 0 });
      this.openReviewModal(parsedData, imageUrl);
    });

    const tbody = document.getElementById('items-tbody');
    if (tbody) {
      tbody.addEventListener('input', (e) => {
        if (e.target.classList.contains('item-product')) {
          const idx = parseInt(e.target.dataset.idx);
          if (this.state.reviewForm.items[idx]) {
            this.state.reviewForm.items[idx].productName = e.target.value;
          }
        } else if (e.target.classList.contains('item-qty')) {
          const idx = parseInt(e.target.dataset.idx);
          if (this.state.reviewForm.items[idx]) {
            this.state.reviewForm.items[idx].quantity = parseFloat(e.target.value) || 0;
          }
        } else if (e.target.classList.contains('item-price')) {
          const idx = parseInt(e.target.dataset.idx);
          if (this.state.reviewForm.items[idx]) {
            this.state.reviewForm.items[idx].unitPrice = parseFloat(e.target.value) || 0;
          }
        }
      });

      tbody.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const idx = parseInt(btn.dataset.idx);
          this.state.reviewForm.items.splice(idx, 1);
          this.openReviewModal(parsedData, imageUrl);
        });
      });
    }

    if (document.getElementById('btn-save-new')) {
      document.getElementById('btn-save-new').addEventListener('click', () => this.saveRemito(true));
    }
    document.getElementById('btn-save-remito').addEventListener('click', () => this.saveRemito(false));
  },

  openManualModal() {
    this.state.reviewForm = {
      storeId: '',
      supplierId: '',
      supplierRaw: '',
      noteNumber: '',
      date: App.todayStr(),
      total: 0,
      notes: '',
      items: []
    };
    this.openReviewModal(null, null);
  },

  async saveRemito(keepOpen = false) {
    const form = this.state.reviewForm;

    if (!form.storeId) {
      App.toast('Selecciona un local', 'warning');
      return;
    }

    if (!form.date || form.total === 0) {
      App.toast('Completa fecha y total', 'warning');
      return;
    }

    try {
      const payload = {
        storeId: form.storeId,
        supplierId: form.supplierId || null,
        noteNumber: form.noteNumber || null,
        date: form.date,
        total: form.total,
        notes: form.notes,
        items: (form.items || []).map(item => ({
          productName: item.productName,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          subtotal: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
        }))
      };

      if (form.id) {
        payload.id = form.id;
        await App.api('/api/remitos.php', { method: 'PUT', body: payload });
      } else {
        await App.api('/api/remitos.php', { method: 'POST', body: payload });
      }

      App.toast('Remito guardado', 'success');
      App.closeModal();

      if (keepOpen) {
        // Reset form for new entry
        this.state.reviewForm = {
          storeId: '',
          supplierId: '',
          supplierRaw: '',
          noteNumber: '',
          date: App.todayStr(),
          total: 0,
          notes: '',
          items: []
        };
        this.openManualModal();
      } else {
        await this.loadRemitos();
      }
    } catch (error) {
      if (error.status === 409) {
        App.toast('Este remito ya existe', 'warning');
      } else {
        console.error('Save error:', error);
        App.toast('Error guardando remito', 'error');
      }
    }
  },

  openBatchModal() {
    // Create 12 default rows
    this.state.batchRows = Array(12).fill(null).map((_, idx) => ({
      index: idx,
      storeId: '',
      supplierId: '',
      noteNumber: '',
      date: App.todayStr(),
      total: 0,
      notes: ''
    }));

    this.renderBatchModal();
  },

  renderBatchModal() {
    const stores = App.state.stores || [];
    const suppliers = App.state.suppliers || [];

    let rowsHTML = '';
    this.state.batchRows.forEach((row, idx) => {
      rowsHTML += `
        <tr>
          <td><input type="date" class="form-input batch-date" data-idx="${idx}" value="${row.date}" /></td>
          <td>
            <select class="form-input form-select batch-store" data-idx="${idx}">
              <option value="">Local</option>
              ${stores.map(s => `<option value="${s.id}" ${s.id === row.storeId ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </td>
          <td>
            <select class="form-input form-select batch-supplier" data-idx="${idx}">
              <option value="">Proveedor</option>
              ${suppliers.map(s => `<option value="${s.id}" ${s.id === row.supplierId ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </td>
          <td><input type="text" class="form-input batch-notenum" data-idx="${idx}" value="${row.noteNumber}" placeholder="Nro" /></td>
          <td><input type="number" class="form-input batch-total" data-idx="${idx}" value="${row.total}" step="0.01" placeholder="Total" style="text-align: right;" /></td>
          <td><input type="text" class="form-input batch-notes" data-idx="${idx}" value="${row.notes}" placeholder="Notas" /></td>
        </tr>
      `;
    });

    const html = `
      <div class="modal-header">
        <h2 class="modal-title">Carga en Batch</h2>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="table-wrapper" style="max-height: 60vh; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 120px;">Fecha</th>
                <th style="width: 140px;">Local</th>
                <th style="width: 140px;">Proveedor</th>
                <th style="width: 100px;">Nro</th>
                <th style="width: 120px;">Total</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody id="batch-tbody">
              ${rowsHTML}
            </tbody>
          </table>
        </div>

        <button class="btn btn-outline" id="btn-batch-add-rows" style="margin-top: 16px;">+ Agregar 10 filas</button>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-batch-save">Guardar batch</button>
      </div>
    `;

    App.openModal(html);

    // Bind batch events
    const tbody = document.getElementById('batch-tbody');

    tbody.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const row = this.state.batchRows[idx];

      if (e.target.classList.contains('batch-date')) {
        row.date = e.target.value;
      } else if (e.target.classList.contains('batch-store')) {
        row.storeId = e.target.value;
      } else if (e.target.classList.contains('batch-supplier')) {
        row.supplierId = e.target.value;
      } else if (e.target.classList.contains('batch-notenum')) {
        row.noteNumber = e.target.value;
      } else if (e.target.classList.contains('batch-total')) {
        row.total = parseFloat(e.target.value) || 0;
      } else if (e.target.classList.contains('batch-notes')) {
        row.notes = e.target.value;
      }
    });

    document.getElementById('btn-batch-add-rows').addEventListener('click', (e) => {
      e.preventDefault();
      const currentCount = this.state.batchRows.length;
      for (let i = 0; i < 10; i++) {
        this.state.batchRows.push({
          index: currentCount + i,
          storeId: '',
          supplierId: '',
          noteNumber: '',
          date: App.todayStr(),
          total: 0,
          notes: ''
        });
      }
      this.renderBatchModal();
    });

    document.getElementById('btn-batch-save').addEventListener('click', async () => {
      const remitos = this.state.batchRows
        .filter(row => row.storeId && row.date && row.total > 0)
        .map(row => ({
          store_id: row.storeId,
          supplier_id: row.supplierId || null,
          note_number: row.noteNumber || null,
          date: row.date,
          total: row.total,
          notes: row.notes || null,
          items: []
        }));

      if (remitos.length === 0) {
        App.toast('Completa al menos una fila con local, fecha y total', 'warning');
        return;
      }

      try {
        await App.api('/api/remitos.php', { method: 'POST', body: { remitos } });
        App.toast(`${remitos.length} remitos guardados`, 'success');
        App.closeModal();
        await this.loadRemitos();
      } catch (error) {
        console.error('Batch error:', error);
        App.toast('Error guardando batch', 'error');
      }
    });
  },

  async deleteRemito(id, label) {
    const confirmed = await App.confirm(`¿Eliminar remito de ${label}?`);
    if (!confirmed) return;

    try {
      await App.api(`/api/remitos.php?id=${id}`, { method: 'DELETE' });
      App.toast('Remito eliminado', 'success');
      await this.loadRemitos();
    } catch (error) {
      console.error('Delete error:', error);
      App.toast('Error eliminando remito', 'error');
    }
  }
};
