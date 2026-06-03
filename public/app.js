const state = {
  products: [],
  sales: [],
  analytics: null,
  activeTab: 'inventory'
};

const els = {
  setupNotice: document.querySelector('#setupNotice'),
  setupButton: document.querySelector('#setupButton'),
  refreshButton: document.querySelector('#refreshButton'),
  searchInput: document.querySelector('#searchInput'),
  stockFilter: document.querySelector('#stockFilter'),
  inventoryList: document.querySelector('#inventoryList'),
  saleForm: document.querySelector('#saleForm'),
  adjustForm: document.querySelector('#adjustForm'),
  reportsButton: document.querySelector('#reportsButton'),
  analyticsGrid: document.querySelector('#analyticsGrid'),
  bestSellers: document.querySelector('#bestSellers'),
  toast: document.querySelector('#toast')
};

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
});

els.refreshButton.addEventListener('click', loadAll);
els.setupButton.addEventListener('click', createSetupSheets);
els.searchInput.addEventListener('input', renderInventory);
els.stockFilter.addEventListener('change', renderInventory);
els.saleForm.addEventListener('submit', submitSale);
els.adjustForm.addEventListener('submit', submitAdjustment);
els.reportsButton.addEventListener('click', generateReports);

loadAll();
setInterval(loadQuietly, 15000);

async function loadAll() {
  els.refreshButton.disabled = true;
  try {
    const setup = await api('/api/setup');
    els.setupNotice.classList.toggle(
      'hidden',
      setup.hasCurrentInventory && setup.hasAdjustments
    );

    const [{ products }, { sales }, analytics] = await Promise.all([
      api('/api/products'),
      api('/api/sales'),
      api('/api/analytics')
    ]);

    state.products = products;
    state.sales = sales;
    state.analytics = analytics;
    renderInventory();
    renderForms();
    renderAnalytics();
  } catch (error) {
    showToast(error.message);
  } finally {
    els.refreshButton.disabled = false;
  }
}

async function loadQuietly() {
  try {
    await loadAll();
  } catch {
    // Manual refresh will show the next visible error.
  }
}

async function createSetupSheets() {
  els.setupButton.disabled = true;
  try {
    await api('/api/setup', { method: 'POST' });
    showToast('Current Inventory and Adjustments sheets are ready.');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    els.setupButton.disabled = false;
  }
}

function renderInventory() {
  const query = els.searchInput.value.trim().toLowerCase();
  const filter = els.stockFilter.value;
  const products = state.products.filter((product) => {
    const matchesSearch = !query || product.searchText.includes(query);
    const matchesFilter = filter === 'all' || product.stockStatus === filter;
    return matchesSearch && matchesFilter && product.active;
  });

  els.inventoryList.innerHTML = products.length
    ? products.map(renderProduct).join('')
    : '<div class="empty-state">No matching products.</div>';
}

function renderProduct(product) {
  const quantity = product.quantity === null ? '—' : product.quantity;
  const price = product.srp ? peso(product.srp) : 'No SRP';

  return `
    <article class="item status-${product.stockStatus}">
      <div>
        <p class="item-title">${escapeHtml(product.productName)}</p>
        <div class="meta">
          <span class="pill">${escapeHtml(product.productCode)}</span>
          <span class="pill">Size ${escapeHtml(product.size || 'N/A')}</span>
          <span class="pill">${price}</span>
          <span class="pill">${labelStatus(product.stockStatus)}</span>
        </div>
      </div>
      <div class="quantity">${quantity}</div>
    </article>
  `;
}

function renderForms() {
  const options = state.products
    .filter((product) => product.active)
    .map((product) => {
      const label = `${product.productCode} · ${product.productName} · ${product.size || 'N/A'}`;
      return `<option value="${escapeHtml(product.skuId)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  els.saleForm.elements.skuId.innerHTML = options;
  els.adjustForm.elements.skuId.innerHTML = options;
}

function renderAnalytics() {
  const analytics = state.analytics;
  if (!analytics) return;

  els.analyticsGrid.innerHTML = [
    metric('Total Sales', peso(analytics.totalSales)),
    metric('Units Sold', analytics.unitsSold),
    metric('Low Stock', analytics.lowStock.length),
    metric('Sold Out', analytics.soldOut.length)
  ].join('');

  els.bestSellers.innerHTML = analytics.bestSellers.length
    ? analytics.bestSellers
        .map(
          (item) => `
          <article class="item">
            <div>
              <p class="item-title">${escapeHtml(item.productCode)}</p>
              <div class="meta"><span class="pill">${item.quantity} sold</span></div>
            </div>
          </article>
        `
        )
        .join('')
    : '<div class="empty-state">No sales yet.</div>';
}

async function submitSale(event) {
  event.preventDefault();
  await submitForm('/api/sales', els.saleForm, 'Sale logged.');
}

async function submitAdjustment(event) {
  event.preventDefault();
  await submitForm('/api/adjustments', els.adjustForm, 'Inventory updated.');
}

async function generateReports() {
  els.reportsButton.disabled = true;
  try {
    const result = await api('/api/reports', { method: 'POST' });
    showToast(`${result.reports.length} report tabs generated.`);
  } catch (error) {
    showToast(error.message);
  } finally {
    els.reportsButton.disabled = false;
  }
}

async function submitForm(url, form, message) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const body = Object.fromEntries(new FormData(form).entries());
    body.confirmNegativeStock = form.elements.confirmNegativeStock?.checked;
    await api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    form.reset();
    showToast(message);
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

function setTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabName);
  });
}

async function api(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function labelStatus(status) {
  return {
    'in-stock': 'In stock',
    'low-stock': 'Low stock',
    'sold-out': 'Sold out',
    uncounted: 'Uncounted'
  }[status];
}

function peso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  setTimeout(() => els.toast.classList.add('hidden'), 4000);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
