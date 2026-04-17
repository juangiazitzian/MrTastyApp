// Mr Tasty App - Pedidos (Orders) Page
// Order recommendation system for BLANCALUNA supplier

const PedidosPage = {
  state: {
    selectedStore: '',
    dayOfWeek: null,
    schedule: {},
    recommendation: null,
    orderHistory: [],
    loading: true,
    recommendLoading: false,
    finalItems: [],
    selectedDay: null,
  },

  async render() {
    const pageContent = document.getElementById('page-content');

    // Default to first store
    if (!this.state.selectedStore && App.state.stores.length > 0) {
      this.state.selectedStore = App.state.stores[0].id;
    }

    // Get current day of week (0=Sunday, 1=Monday, etc.)
    this.state.dayOfWeek = new Date().getDay();
    this.state.selectedDay = this.state.dayOfWeek;

    this.state.loading = true;
    pageContent.innerHTML = `<div class="p-8"><div class="text-white/50">Cargando recomendación de pedido...</div></div>`;

    await Promise.all([
      this.loadSchedule(),
      this.loadHistory(),
      this.generateRecommendation(),
    ]);

    pageContent.innerHTML = this.getHTML();
    this.bindEvents();
  },

  async loadSchedule() {
    try {
      const response = await App.api('/api/pedidos.php?action=schedule');
      this.state.schedule = response.schedule || {};
    } catch (error) {
      console.error('Error loading schedule:', error);
      App.toast('Error cargando calendario de entregas', 'error');
    }
  },

  async loadHistory() {
    try {
      const response = await App.api(`/api/pedidos.php?storeId=${this.state.selectedStore}`);
      this.state.orderHistory = response.orders || [];
    } catch (error) {
      console.error('Error loading order history:', error);
      App.toast('Error cargando historial de pedidos', 'error');
    }
  },

  async generateRecommendation() {
    try {
      this.state.recommendLoading = true;
      const response = await App.api(
        `/api/pedidos.php?action=recommend&storeId=${this.state.selectedStore}&dayOfWeek=${this.state.selectedDay}`
      );

      this.state.recommendation = response.recommendation || null;
      this.state.finalItems = response.recommendation?.items?.map(item => ({
        ...item,
        finalQuantity: item.suggestedQuantity,
      })) || [];

      this.state.recommendLoading = false;
    } catch (error) {
      console.error('Error generating recommendation:', error);
      this.state.recommendLoading = false;
      App.toast('Error generando recomendación', 'error');
    }
  },

  getHTML() {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const orderDays = [1, 3, 5]; // Monday, Wednesday, Friday
    const isOrderDay = orderDays.includes(this.state.dayOfWeek);

    const currentDaySchedule = this.state.schedule[this.state.selectedDay];
    const nextOrderDay = dayNames[
      [1, 2, 3, 4, 5, 6, 0].find(day => orderDays.includes(day) && day > this.state.dayOfWeek) || 1
    ];

    return `
      <div class="p-8 max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-4xl font-bold text-white mb-2">🛒 Pedido BLANCALUNA</h1>
            <p class="text-white/50">Sistema de recomendación inteligente de pedidos</p>
          </div>
          <div class="flex items-center gap-3">
            <select id="store-select" class="form-select bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
              ${App.state.stores.map(store => `
                <option value="${store.id}" ${store.id === this.state.selectedStore ? 'selected' : ''}>
                  ${store.name}
                </option>
              `).join('')}
            </select>
            <select id="day-select" class="form-select bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
              ${[1, 3, 5].map(day => `
                <option value="${day}" ${day === this.state.selectedDay ? 'selected' : ''}>
                  ${dayNames[day]}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Info Banner -->
        ${!isOrderDay ? `
          <div class="alert alert-info mb-8 border-l-4 border-blue-400">
            <p class="font-semibold text-white">ℹ️ Hoy no es día de pedido</p>
            <p class="text-white/70 text-sm">El próximo pedido es el <strong>${nextOrderDay}</strong>, pero puedes generar recomendaciones para cualquier día.</p>
          </div>
        ` : ''}

        <!-- Coverage Info Card -->
        ${currentDaySchedule ? `
          <div class="card mb-8 bg-gradient-to-r from-orange-500/10 to-orange-400/5 border border-orange-400/20">
            <div class="card-content">
              <div class="grid grid-2 gap-8">
                <div>
                  <p class="text-white/50 text-sm mb-1">Día de pedido</p>
                  <p class="text-2xl font-bold text-orange-400">${dayNames[this.state.selectedDay]}</p>
                </div>
                <div>
                  <p class="text-white/50 text-sm mb-1">Días de cobertura</p>
                  <p class="text-2xl font-bold text-orange-400">${currentDaySchedule.coverageDays} días</p>
                </div>
              </div>
              <p class="text-white/70 text-sm mt-4">
                Este pedido cubrirá hasta: <strong>${dayNames[currentDaySchedule.coverageDayNumbers[currentDaySchedule.coverageDayNumbers.length - 1]]}</strong>
              </p>
            </div>
          </div>
        ` : ''}

        <!-- Recommendation Table -->
        <div class="card mb-8">
          <div class="card-header flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white">Recomendación de cantidad</h2>
            ${this.state.recommendLoading ? `
              <span class="text-white/50 text-sm">Cargando...</span>
            ` : `
              <button id="recalculate-btn" class="btn btn-sm btn-outline">
                🔄 Recalcular
              </button>
            `}
          </div>
          <div class="card-content">
            ${this.state.recommendation && this.state.finalItems.length > 0 ? `
              <div class="data-table overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="border-b border-white/10">
                    <tr class="text-white/70">
                      <th class="text-left py-3 px-4 min-w-40">Producto</th>
                      <th class="text-right py-3 px-4">Stock actual</th>
                      <th class="text-right py-3 px-4">Prom. diario</th>
                      <th class="text-right py-3 px-4">Días cobertura</th>
                      <th class="text-right py-3 px-4">Stock objetivo</th>
                      <th class="text-right py-3 px-4">Sugerido</th>
                      <th class="text-right py-3 px-4">Final</th>
                      <th class="text-left py-3 px-4">Unidad</th>
                      <th class="text-center py-3 px-4">Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.state.finalItems.map((item, index) => `
                      <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-3 px-4 text-white font-medium">${item.productName}</td>
                        <td class="py-3 px-4 text-right text-orange-400">${item.currentStock}</td>
                        <td class="py-3 px-4 text-right text-white/70">${item.avgDailyUsage.toFixed(2)}</td>
                        <td class="py-3 px-4 text-right text-white/70">${currentDaySchedule.coverageDays}</td>
                        <td class="py-3 px-4 text-right text-blue-400 font-semibold">${item.targetStock.toFixed(2)}</td>
                        <td class="py-3 px-4 text-right text-green-400 font-semibold">${item.suggestedQuantity.toFixed(2)}</td>
                        <td class="py-3 px-4 text-right">
                          <input type="number"
                            class="form-input w-20 text-center final-qty-input"
                            data-index="${index}"
                            value="${item.finalQuantity.toFixed(2)}"
                            step="0.01"
                            min="0"
                            style="background-color: rgba(255,255,255,0.05);">
                        </td>
                        <td class="py-3 px-4 text-left text-white/50">${item.unit}</td>
                        <td class="py-3 px-4 text-center">
                          <button class="text-orange-400 hover:text-orange-300 text-sm font-semibold detail-btn" data-index="${index}">
                            ?
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3 justify-end pt-6 border-t mt-6">
                <button id="cancel-order-btn" class="btn btn-outline">
                  Cancelar
                </button>
                <button id="confirm-order-btn" class="btn btn-primary">
                  ✓ Confirmar pedido
                </button>
              </div>
            ` : `
              <div class="text-center py-12">
                <p class="text-white/50">No hay recomendación disponible para este día y local</p>
                <p class="text-white/40 text-sm mt-2">Asegúrate de tener baselines de consumo configurados en Configuración</p>
              </div>
            `}
          </div>
        </div>

        <!-- Order History -->
        <div class="card">
          <div class="card-header">
            <h2 class="text-2xl font-bold text-white">Historial de pedidos</h2>
          </div>
          <div class="card-content">
            ${this.state.orderHistory.length > 0 ? `
              <div class="space-y-3 max-h-96 overflow-y-auto">
                ${this.state.orderHistory.map(order => {
                  let statusColor = 'badge-warning';
                  if (order.status === 'confirmado') statusColor = 'badge-success';
                  else if (order.status === 'enviado') statusColor = 'badge-blue';

                  return `
                    <div class="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors cursor-pointer" onclick="PedidosPage.viewOrderDetail('${order.id}')">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-3 mb-2">
                            <span class="text-white font-semibold">${App.formatDate(order.orderDate)}</span>
                            <span class="badge ${statusColor}">
                              ${order.status === 'borrador' ? 'Borrador' :
                                order.status === 'confirmado' ? 'Confirmado' : 'Enviado'}
                            </span>
                          </div>
                          <p class="text-white/50 text-sm">${order.items.length} productos • ${order.coverageDays} días cobertura</p>
                        </div>
                        <div class="text-right">
                          <p class="text-white text-sm">Total: ${order.items.length} items</p>
                          <p class="text-orange-400 text-xs mt-1">Ver detalle →</p>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="text-center py-8">
                <p class="text-white/50">No hay pedidos registrados aún</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // Store select
    const storeSelect = document.getElementById('store-select');
    if (storeSelect) {
      storeSelect.addEventListener('change', async (e) => {
        this.state.selectedStore = e.target.value;
        await this.render();
      });
    }

    // Day select
    const daySelect = document.getElementById('day-select');
    if (daySelect) {
      daySelect.addEventListener('change', async (e) => {
        this.state.selectedDay = parseInt(e.target.value);
        await this.generateRecommendation();
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = this.getHTML();
        this.bindEvents();
      });
    }

    // Final quantity inputs
    document.querySelectorAll('.final-qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.state.finalItems[index].finalQuantity = parseFloat(e.target.value) || 0;
      });
    });

    // Detail buttons
    document.querySelectorAll('.detail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(btn.dataset.index);
        this.showCalculationDetail(this.state.finalItems[index]);
      });
    });

    // Recalculate button
    const recalculateBtn = document.getElementById('recalculate-btn');
    if (recalculateBtn) {
      recalculateBtn.addEventListener('click', async () => {
        await this.generateRecommendation();
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = this.getHTML();
        this.bindEvents();
      });
    }

    // Confirm order button
    const confirmBtn = document.getElementById('confirm-order-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.saveOrder();
      });
    }

    // Cancel order button
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.state.finalItems = [];
        App.navigate('pedidos');
      });
    }
  },

  showCalculationDetail(item) {
    const schedule = this.state.schedule[this.state.selectedDay];
    const detail = this.formatCalculationDetail(item, schedule.coverageDays);

    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-2xl">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">${item.productName}</h2>

        <div class="space-y-6 text-gray-900">
          <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <p class="font-mono text-sm whitespace-pre-line">${detail}</p>
          </div>

          <div class="grid grid-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-xs text-gray-600 mb-1">Stock actual</p>
              <p class="text-2xl font-bold text-gray-900">${item.currentStock}</p>
            </div>
            <div class="bg-blue-50 rounded-lg p-4">
              <p class="text-xs text-gray-600 mb-1">Stock objetivo</p>
              <p class="text-2xl font-bold text-blue-600">${item.targetStock.toFixed(2)}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
              <p class="text-xs text-gray-600 mb-1">Sugerido</p>
              <p class="text-2xl font-bold text-green-600">${item.suggestedQuantity.toFixed(2)}</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-4">
              <p class="text-xs text-gray-600 mb-1">Margen de seguridad</p>
              <p class="text-2xl font-bold text-orange-600">${(item.safetyStock || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3 justify-end pt-6 border-t mt-6">
          <button data-close-modal class="btn btn-outline">
            Entendido
          </button>
        </div>
      </div>
    `;

    App.openModal(html);
  },

  formatCalculationDetail(item, coverageDays) {
    const safetyStock = item.safetyStock || 0;
    const targetCalc = (item.avgDailyUsage * coverageDays) + safetyStock;
    const suggestedCalc = Math.max(0, item.targetStock - item.currentStock);

    return `CÁLCULO DE RECOMENDACIÓN

Stock objetivo = (promedio diario × días cobertura) + margen
Stock objetivo = (${item.avgDailyUsage.toFixed(2)} × ${coverageDays}) + ${safetyStock.toFixed(2)}
Stock objetivo = ${targetCalc.toFixed(2)}

Pedido sugerido = máx(0, Stock objetivo - Stock actual)
Pedido sugerido = máx(0, ${item.targetStock.toFixed(2)} - ${item.currentStock})
Pedido sugerido = ${suggestedCalc.toFixed(2)} ${item.unit}

Este cálculo asegura tener stock suficiente
para los próximos ${coverageDays} días más un margen
de seguridad.`;
  },

  async saveOrder() {
    const schedule = this.state.schedule[this.state.selectedDay];
    if (!schedule) {
      App.toast('Configura el calendario de entregas primero', 'warning');
      return;
    }

    // Validate at least one item ordered
    const orderedItems = this.state.finalItems.filter(item => item.finalQuantity > 0);
    if (orderedItems.length === 0) {
      App.toast('Debes ordenar al menos un producto', 'warning');
      return;
    }

    // Calculate delivery date (orderDay + coverageDays)
    const orderDate = new Date();
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + schedule.coverageDays);

    const orderDateStr = orderDate.toISOString().split('T')[0];
    const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

    try {
      await App.api('/api/pedidos.php', {
        method: 'POST',
        body: JSON.stringify({
          storeId: this.state.selectedStore,
          orderDate: orderDateStr,
          deliveryDate: deliveryDateStr,
          dayOfWeek: this.state.selectedDay,
          coverageDays: schedule.coverageDays,
          status: 'confirmado',
          items: orderedItems.map(item => ({
            productId: item.productId,
            quantity: item.finalQuantity,
            suggestedQuantity: item.suggestedQuantity,
          })),
        }),
      });

      App.toast('Pedido confirmado exitosamente', 'success');
      this.state.finalItems = [];
      await this.loadHistory();
      const pageContent = document.getElementById('page-content');
      pageContent.innerHTML = this.getHTML();
      this.bindEvents();
    } catch (error) {
      console.error('Error saving order:', error);
      App.toast('Error al confirmar pedido', 'error');
    }
  },

  viewOrderDetail(orderId) {
    const order = this.state.orderHistory.find(o => o.id === orderId);
    if (!order) return;

    const html = `
      <div class="bg-white/95 rounded-lg p-8 max-w-3xl max-h-96 overflow-y-auto">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Detalle de Pedido</h2>

        <div class="space-y-4 text-gray-900 mb-6">
          <div class="grid grid-2 gap-4">
            <div>
              <p class="text-xs text-gray-600 mb-1">Fecha pedido</p>
              <p class="font-semibold">${App.formatDate(order.orderDate)}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Fecha entrega</p>
              <p class="font-semibold">${App.formatDate(order.deliveryDate)}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Estado</p>
              <p class="font-semibold">${order.status}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Cobertura</p>
              <p class="font-semibold">${order.coverageDays} días</p>
            </div>
          </div>
        </div>

        <div class="border-t pt-4">
          <h3 class="font-semibold text-gray-900 mb-3">Productos</h3>
          <div class="space-y-2 text-sm">
            ${order.items.map(item => `
              <div class="flex items-center justify-between p-2 bg-gray-100 rounded">
                <span>${item.productName}</span>
                <span class="font-semibold">${item.quantity} ${item.unit}</span>
              </div>
            `).join('')}
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
};
