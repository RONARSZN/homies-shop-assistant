import { categoryLabel, getInventoryView } from './inventoryGroups.js';
import { buildSalePayloadFromRows } from './saleItems.js';
import { saleSearchLabel } from './productSearch.js';
import { toClientMessage } from './userFacingErrors.js';
import { appAccessRedirectUrl, shouldRedirectToAccess } from './appAccessRedirect.js';
import { renderPrimaryNavigation } from './navigation.js';

let sessionPassword = sessionStorage.getItem('shopPassword') || '';
const state = {
  products: [],
  sales: [],
  analytics: null,
  activeTab: 'inventory',
  selectedCategory: null,
  editorPassword: '',
  frontDeskPassword: '',
  frontDeskUnlocked: false,
  frontDeskTransactions: [],
  appAccess: {
    enabled: false,
    unlocked: true
  }
};

const els = {
  loginOverlay: document.querySelector('#loginOverlay'),
  passwordInput: document.querySelector('#passwordInput'),
  loginButton: document.querySelector('#loginButton'),
  loginError: document.querySelector('#loginError'),
  setupNotice: document.querySelector('#setupNotice'),
  setupNotice: document.querySelector('#setupNotice'),
  setupButton: document.querySelector('#setupButton'),
  appAccessButton: document.querySelector('#appAccessButton'),
  refreshButton: document.querySelector('#refreshButton'),
  primaryNav: document.querySelector('#primaryNav'),
  searchInput: document.querySelector('#searchInput'),
  stockFilter: document.querySelector('#stockFilter'),
  inventoryMovement: document.querySelector('#inventoryMovement'),
  inventoryList: document.querySelector('#inventoryList'),
  saleForm: document.querySelector('#saleForm'),
  saleItems: document.querySelector('#saleItems'),
  addSaleItemButton: document.querySelector('#addSaleItemButton'),
  saleProductOptions: document.querySelector('#saleProductOptions'),
  stockCountForm: document.querySelector('#stockCountForm'),
  stockCountSearchInput: document.querySelector('#stockCountSearchInput'),
  stockCountCurrent: document.querySelector('#stockCountCurrent'),
  frontDeskUnlockForm: document.querySelector('#frontDeskUnlockForm'),
  frontDeskPanel: document.querySelector('#frontDeskPanel'),
  frontDeskHistoryToggle: document.querySelector('#frontDeskHistoryToggle'),
  frontDeskRefreshButton: document.querySelector('#frontDeskRefreshButton'),
  frontDeskQueue: document.querySelector('#frontDeskQueue'),
  priceSearchInput: document.querySelector('#priceSearchInput'),
  priceCheckerResults: document.querySelector('#priceCheckerResults'),
  editorPasswordInput: document.querySelector('#editorPasswordInput'),
  unlockEditorButton: document.querySelector('#unlockEditorButton'),
  itemEditorForm: document.querySelector('#itemEditorForm'),
  adjustForm: document.querySelector('#adjustForm'),
  reportsButton: document.querySelector('#reportsButton'),
  analyticsGrid: document.querySelector('#analyticsGrid'),
  bestSellers: document.querySelector('#bestSellers'),
  toast: document.querySelector('#toast')
};

renderNavigation();
els.primaryNav.addEventListener('click', handleNavigationClick);
els.appAccessButton.addEventListener('click', handleAppAccessClick);
els.refreshButton.addEventListener('click', loadAll);
els.setupButton.addEventListener('click', createSetupSheets);
els.searchInput.addEventListener('input', renderInventory);
els.stockFilter.addEventListener('change', renderInventory);
els.inventoryList.addEventListener('click', handleInventoryClick);
els.addSaleItemButton.addEventListener('click', () => addSaleItemRow());
els.saleItems.addEventListener('click', handleSaleItemsClick);
els.saleForm.addEventListener('submit', submitSale);
els.stockCountSearchInput.addEventListener('input', renderStockCountForm);
els.stockCountForm.addEventListener('change', handleStockCountChange);
els.stockCountForm.addEventListener('submit', submitStockCount);
els.frontDeskUnlockForm.addEventListener('submit', unlockFrontDesk);
els.frontDeskHistoryToggle.addEventListener('change', loadFrontDeskQueue);
els.frontDeskRefreshButton.addEventListener('click', loadFrontDeskQueue);
els.frontDeskQueue.addEventListener('click', handleFrontDeskAction);
els.priceSearchInput.addEventListener('input', renderPriceChecker);
els.unlockEditorButton.addEventListener('click', unlockEditor);
els.itemEditorForm.addEventListener('submit', saveItemPrice);
els.adjustForm.addEventListener('submit', submitAdjustment);
els.reportsButton.addEventListener('click', generateReports);
els.loginButton.addEventListener('click', attemptLogin);
els.passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptLogin();
});

loadAccessStatus();
if (sessionPassword) {
  loadAll();
} else {
  els.loginOverlay.classList.remove('hidden');
  els.passwordInput.focus();
}
setInterval(loadQuietly, 15000);

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (sessionPassword) headers['Authorization'] = `Bearer ${sessionPassword}`;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    sessionPassword = '';
    sessionStorage.removeItem('shopPassword');
    els.loginOverlay.classList.remove('hidden');
    els.passwordInput.focus();
    throw new Error('Session expired. Please log in again.');
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

async function attemptLogin() {
  const entered = els.passwordInput.value.trim();
  if (!entered) return;
  els.loginButton.disabled = true;
  els.loginError.classList.add('hidden');
  try {
    const response = await fetch('/api/products', {
      headers: { 'Authorization': `Bearer ${entered}` }
    });
    if (response.status === 401) {
      els.loginError.classList.remove('hidden');
      els.passwordInput.value = '';
      els.passwordInput.focus();
      return;
    }
    sessionPassword = entered;
    sessionStorage.setItem('shopPassword', entered);
    els.loginOverlay.classList.add('hidden');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    els.loginButton.disabled = false;
  }
}

    const [{ products }, { sales }, analytics] = await Promise.all([
      api('/api/products'),
      api('/api/sales'),
      api('/api/analytics')
    ]);

    state.products = products;
    state.sales = sales;
    state.analytics = analytics;
    renderInventoryMovement();
    renderInventory();
    renderForms();
    renderAnalytics();
    renderPriceChecker();
    if (state.frontDeskUnlocked) await loadFrontDeskQueue();
  } catch (error) {
    showToast(error.message);
  } finally {
    els.refreshButton.disabled = false;
  }
}

async function loadAccessStatus() {
  try {
    const status = await api('/api/access/status');
    state.appAccess = status;
    renderAppAccessButton();
  } catch {
    state.appAccess = { enabled: true, unlocked: false };
    renderAppAccessButton();
  }
}

function renderAppAccessButton() {
  if (!state.appAccess.enabled) {
    els.appAccessButton.classList.add('hidden');
    return;
  }

  els.appAccessButton.classList.remove('hidden');
  els.appAccessButton.textContent = state.appAccess.unlocked ? 'Lock' : 'Unlock';
  els.appAccessButton.setAttribute(
    'aria-label',
    state.appAccess.unlocked ? 'Lock app access' : 'Unlock app access'
  );
}

async function handleAppAccessClick() {
  if (!state.appAccess.unlocked) {
    redirectToAccess();
    return;
  }

  els.appAccessButton.disabled = true;
  try {
    await api('/api/access/lock', { method: 'POST' });
    window.location.href = '/access';
  } catch (error) {
    showToast(error.message);
    els.appAccessButton.disabled = false;
  }
}

function renderInventoryMovement() {
  const movement = state.analytics?.inventoryMovement;

  if (!movement) {
    els.inventoryMovement.innerHTML = '';
    return;
  }

  if (!movement.productsWithMovement) {
    els.inventoryMovement.innerHTML = `
      <div class="movement-header">
        <div>
          <p class="eyebrow">Verified movement</p>
          <h2>Last 30 days</h2>
        </div>
      </div>
      <div class="empty-state">No verified sales movement in the last 30 days.</div>
    `;
    return;
  }

  els.inventoryMovement.innerHTML = `
    <div class="movement-header">
      <div>
        <p class="eyebrow">Verified movement</p>
        <h2>Last 30 days</h2>
      </div>
      <span>${escapeHtml(movement.rangeStart)} to ${escapeHtml(movement.rangeEnd)}</span>
    </div>
    <div class="movement-metrics">
      ${metric('Units Sold', movement.totalUnits)}
      ${metric('Sales Amount', peso(movement.totalSalesAmount))}
      ${metric('Products Moved', movement.productsWithMovement)}
      ${metric('Best Mover', movement.bestMovingProduct?.productCode || 'None')}
    </div>
    <div class="movement-charts">
      ${renderDailyChart('Daily Units', movement.daily, 'units', (value) => String(value))}
      ${renderDailyChart('Daily Sales', movement.daily, 'salesAmount', peso)}
    </div>
    <div class="movement-rankings">
      ${renderMovementList('Top Units', movement.topByUnits, 'units', (item) => `${item.units} sold`)}
      ${renderMovementList('Top Sales', movement.topBySales, 'salesAmount', (item) => peso(item.salesAmount))}
    </div>
  `;
}

function renderDailyChart(title, rows, key, formatValue) {
  const max = Math.max(...rows.map((row) => row[key]), 1);

  return `
    <section class="movement-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="daily-chart" aria-label="${escapeHtml(title)} last 30 days">
        ${rows.map((row) => `
          <div class="daily-bar" title="${escapeHtml(row.date)}: ${escapeHtml(formatValue(row[key]))}">
            <span style="height:${Math.max(4, Math.round((row[key] / max) * 100))}%"></span>
          </div>
        `).join('')}
      </div>
      <div class="chart-axis">
        <span>${escapeHtml(rows[0]?.date || '')}</span>
        <span>${escapeHtml(rows.at(-1)?.date || '')}</span>
      </div>
    </section>
  `;
}

function renderMovementList(title, rows, key, formatValue) {
  const max = Math.max(...rows.map((row) => row[key]), 1);

  return `
    <section class="movement-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="movement-list">
        ${rows.map((item, index) => `
          <article class="movement-row">
            <div>
              <strong>${index + 1}. ${escapeHtml(item.productCode)}</strong>
              <span>${escapeHtml(item.productName)}${item.size ? ` · ${escapeHtml(item.size)}` : ''}</span>
            </div>
            <em>${escapeHtml(formatValue(item))}</em>
            <i style="width:${Math.max(8, Math.round((item[key] / max) * 100))}%"></i>
          </article>
        `).join('')}
      </div>
    </section>
  `;
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
  const view = getInventoryView(state.products, {
    query,
    stockFilter: filter,
    selectedCategory: state.selectedCategory
  });

  els.inventoryList.innerHTML = view.groups.length
    ? view.mode === 'categories'
      ? renderCategoryCards(view.groups)
      : renderOpenedInventory(view.groups, query)
    : '<div class="empty-state">No matching products.</div>';
}

function renderCategoryCards(groups) {
  return `
    <div class="category-grid">
      ${groups.map(renderCategoryCard).join('')}
    </div>
  `;
}

function renderCategoryCard(group) {
  return `
    <button class="category-card" type="button" data-category="${escapeHtml(group.category)}">
      <span>${escapeHtml(categoryLabel(group.category))}</span>
      <strong>${group.products.length}</strong>
    </button>
  `;
}

function renderOpenedInventory(groups, query) {
  const title = query
    ? 'Search results'
    : categoryLabel(state.selectedCategory || groups[0].category);

  return `
    <div class="opened-inventory-header">
      <button class="secondary-button" type="button" data-action="clear-category">All groups</button>
      <span>${escapeHtml(title)}</span>
    </div>
    ${groups.map(renderInventoryGroup).join('')}
  `;
}

function renderInventoryGroup(group) {
  return `
    <section class="inventory-group">
      <div class="group-header">
        <h2>${escapeHtml(categoryLabel(group.category))}</h2>
        <span>${group.products.length} item${group.products.length === 1 ? '' : 's'}</span>
      </div>
      <div class="list grouped-list">
        ${group.products.map(renderProduct).join('')}
      </div>
    </section>
  `;
}

function handleInventoryClick(event) {
  const categoryCard = event.target.closest('[data-category]');
  const clearButton = event.target.closest('[data-action="clear-category"]');

  if (categoryCard) {
    state.selectedCategory = categoryCard.dataset.category;
    els.searchInput.value = '';
    renderInventory();
  }

  if (clearButton) {
    state.selectedCategory = null;
    renderInventory();
  }
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
  els.saleProductOptions.innerHTML = state.products
    .filter((product) => product.active)
    .map((product) => {
      const label = saleSearchLabel(product);
      return `<option value="${escapeHtml(label)}"></option>`;
    })
    .join('');

  els.adjustForm.elements.skuId.innerHTML = state.products
    .filter((product) => product.active)
    .map((product) => {
      const label = `${product.productCode} · ${product.productName} · ${product.size || 'N/A'}`;
      return `<option value="${escapeHtml(product.skuId)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  els.itemEditorForm.elements.skuId.innerHTML = state.products
    .filter((product) => product.active)
    .map((product) => {
      const label = `${product.productCode} · ${product.productName} · ${product.size || 'N/A'}`;
      return `<option value="${escapeHtml(product.skuId)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  renderStockCountForm();
}

function renderStockCountForm() {
  const search = els.stockCountSearchInput.value.trim().toLowerCase();
  const activeProducts = state.products
    .filter((product) => product.active)
    .filter((product) => !search || product.searchText.includes(search))
    .slice(0, 80);
  const selectedSku = els.stockCountForm.elements.skuId.value;

  els.stockCountForm.elements.skuId.innerHTML = activeProducts.length
    ? activeProducts.map((product) => {
        const label = stockCountLabel(product);
        return `<option value="${escapeHtml(product.skuId)}">${escapeHtml(label)}</option>`;
      }).join('')
    : '<option value="">No active matching products</option>';

  if (activeProducts.some((product) => product.skuId === selectedSku)) {
    els.stockCountForm.elements.skuId.value = selectedSku;
  }

  renderStockCountCurrent();
}

function handleStockCountChange(event) {
  if (event.target.name === 'skuId') renderStockCountCurrent();
}

function renderStockCountCurrent() {
  const product = selectedStockCountProduct();

  if (!product) {
    els.stockCountCurrent.textContent = 'Current quantity: Choose a product';
    return;
  }

  els.stockCountCurrent.textContent = [
    `Current quantity: ${product.quantity ?? 'Uncounted'}`,
    `Last counted: ${product.lastCountedAt || 'Never'}`,
    `Notes: ${product.notes || 'None'}`
  ].join(' | ');
}

function selectedStockCountProduct() {
  const skuId = els.stockCountForm.elements.skuId.value;
  return state.products.find((product) => product.skuId === skuId && product.active);
}

function renderPriceChecker() {
  const query = els.priceSearchInput.value.trim().toLowerCase();

  if (!query) {
    els.priceCheckerResults.innerHTML = '<div class="empty-state">Search an item to check price and stock.</div>';
    return;
  }

  const matches = state.products
    .filter((product) => product.active && product.searchText.includes(query))
    .slice(0, 20);

  els.priceCheckerResults.innerHTML = matches.length
    ? matches.map(renderPriceResult).join('')
    : '<div class="empty-state">No matching items.</div>';
}

function renderPriceResult(product) {
  const quantity = product.quantity === null ? 'Uncounted' : product.quantity;

  return `
    <article class="item">
      <div>
        <p class="item-title">${escapeHtml(product.productName)}</p>
        <div class="meta">
          <span class="pill">${escapeHtml(product.productCode)}</span>
          <span class="pill">Size ${escapeHtml(product.size || 'N/A')}</span>
          <span class="pill">${product.srp ? peso(product.srp) : 'No SRP'}</span>
          <span class="pill">${labelStatus(product.stockStatus)}</span>
        </div>
      </div>
      <div class="quantity">${quantity}</div>
    </article>
  `;
}

async function unlockEditor() {
  try {
    await api('/api/editor/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: els.editorPasswordInput.value })
    });
    state.editorPassword = els.editorPasswordInput.value;
    els.itemEditorForm.classList.remove('hidden');
    showToast('Editor unlocked.');
  } catch (error) {
    showToast(error.message);
  }
}

async function saveItemPrice(event) {
  event.preventDefault();
  const skuId = els.itemEditorForm.elements.skuId.value;

  try {
    await api(`/api/products/${encodeURIComponent(skuId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: state.editorPassword,
        srp: els.itemEditorForm.elements.srp.value
      })
    });
    showToast('Price updated.');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  }
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
  const button = els.saleForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const payload = buildSalePayloadFromRows({
      products: state.products,
      rows: [...els.saleItems.querySelectorAll('.sale-item-row')].map((row) => ({
        productSearch: row.querySelector('[name="productSearch"]').value,
        quantitySold: row.querySelector('[name="quantitySold"]').value,
        salePrice: row.querySelector('[name="salePrice"]').value
      })),
      sharedFields: saleSharedFields()
    });
    const result = await api('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    resetSaleForm();
    showToast(`Pending sale ${result.pendingId} sent to Front Desk.`);
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function unlockFrontDesk(event) {
  event.preventDefault();
  const password = els.frontDeskUnlockForm.elements.password.value;

  try {
    await api('/api/front-desk/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    state.frontDeskPassword = password;
    state.frontDeskUnlocked = true;
    els.frontDeskUnlockForm.classList.add('hidden');
    els.frontDeskPanel.classList.remove('hidden');
    showToast('Front Desk unlocked.');
    await loadFrontDeskQueue();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadFrontDeskQueue() {
  if (!state.frontDeskUnlocked) return;

  try {
    const history = els.frontDeskHistoryToggle.checked ? '?history=true' : '';
    const result = await api(`/api/front-desk/pending${history}`, {
      headers: { 'x-front-desk-password': state.frontDeskPassword }
    });
    state.frontDeskTransactions = result.transactions;
    renderFrontDeskQueue();
  } catch (error) {
    showToast(error.message);
  }
}

function renderFrontDeskQueue() {
  els.frontDeskQueue.innerHTML = state.frontDeskTransactions.length
    ? state.frontDeskTransactions.map(renderFrontDeskTransaction).join('')
    : '<div class="empty-state">No pending Front Desk items.</div>';
}

function renderFrontDeskTransaction(transaction) {
  const total = transaction.items.reduce((sum, item) => sum + item.amount, 0);
  const pendingItems = transaction.items.filter((item) => item.status === 'PENDING');
  const groupButtons = pendingItems.length
    ? `
      <div class="front-desk-actions">
        <button type="button" data-front-desk-action="verify-all" data-pending-id="${escapeHtml(transaction.pendingId)}">Verify all</button>
        <button class="secondary-button" type="button" data-front-desk-action="cancel-all" data-pending-id="${escapeHtml(transaction.pendingId)}">Cancel all</button>
      </div>
    `
    : '';

  return `
    <article class="transaction">
      <div class="transaction-header">
        <div>
          <p class="item-title">${escapeHtml(transaction.pendingId)}</p>
          <div class="meta">
            <span class="pill">${escapeHtml(transaction.saleDate)}</span>
            <span class="pill">${escapeHtml(transaction.customerName || 'No customer')}</span>
            <span class="pill">${escapeHtml(transaction.staffName || 'No seller')}</span>
            <span class="pill">${peso(total)}</span>
          </div>
        </div>
        ${groupButtons}
      </div>
      <div class="list">
        ${transaction.items.map(renderFrontDeskItem).join('')}
      </div>
    </article>
  `;
}

function renderFrontDeskItem(item) {
  const actions = item.status === 'PENDING'
    ? `
      <div class="front-desk-actions">
        <button type="button" data-front-desk-action="verify-item" data-row-number="${item.rowNumber}">Verify item</button>
        <button class="secondary-button" type="button" data-front-desk-action="cancel-item" data-row-number="${item.rowNumber}">Cancel item</button>
      </div>
    `
    : `<span class="pill">${escapeHtml(item.status)}</span>`;

  return `
    <article class="item front-desk-item">
      <div>
        <p class="item-title">${escapeHtml(item.productName)}</p>
        <div class="meta">
          <span class="pill">${escapeHtml(item.productCode)}</span>
          <span class="pill">Size ${escapeHtml(item.size || 'N/A')}</span>
          <span class="pill">Qty ${item.quantity}</span>
          <span class="pill">${peso(item.amount)}</span>
        </div>
      </div>
      ${actions}
    </article>
  `;
}

async function handleFrontDeskAction(event) {
  const button = event.target.closest('[data-front-desk-action]');
  if (!button) return;

  const action = button.dataset.frontDeskAction;
  const isCancel = action.startsWith('cancel');
  const body = { staffName: 'Front Desk', password: state.frontDeskPassword };

  if (isCancel) {
    const cancelReason = window.prompt('Cancel reason');
    if (!cancelReason?.trim()) {
      showToast('Cancel reason is required.');
      return;
    }
    const password = window.prompt('Front Desk password');
    body.password = password || '';
    body.cancelReason = cancelReason;
  }

  const url = frontDeskActionUrl(action, button);
  if (!url) return;

  button.disabled = true;
  try {
    await api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    showToast(isCancel ? 'Pending sale canceled.' : 'Pending sale verified.');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

function frontDeskActionUrl(action, button) {
  if (action === 'verify-item') {
    return `/api/front-desk/items/${encodeURIComponent(button.dataset.rowNumber)}/verify`;
  }
  if (action === 'cancel-item') {
    return `/api/front-desk/items/${encodeURIComponent(button.dataset.rowNumber)}/cancel`;
  }
  if (action === 'verify-all') {
    return `/api/front-desk/transactions/${encodeURIComponent(button.dataset.pendingId)}/verify`;
  }
  if (action === 'cancel-all') {
    return `/api/front-desk/transactions/${encodeURIComponent(button.dataset.pendingId)}/cancel`;
  }
  return '';
}

async function submitStockCount(event) {
  event.preventDefault();
  const form = els.stockCountForm;
  const button = form.querySelector('button[type="submit"]');
  const quantity = Number(form.elements.quantity.value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    showToast('Quantity must be a whole number 0 or higher.');
    return;
  }

  button.disabled = true;

  try {
    await api('/api/stock-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
    });
    const countedBy = form.elements.countedBy.value;
    form.reset();
    form.elements.countedBy.value = countedBy || 'Mark';
    showToast('Stock count saved.');
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
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
    const result = await api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    form.reset();
    showToast(
      result.whatsapp?.error
        ? `${message} WhatsApp did not send: ${result.whatsapp.error}`
        : message
    );
    await loadAll();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

function addSaleItemRow() {
  const rowId = `sale-item-${Date.now()}-${els.saleItems.children.length}`;

  els.saleItems.insertAdjacentHTML(
    'beforeend',
    `
      <fieldset class="sale-item-row" aria-label="Sale item">
        <legend>Item ${els.saleItems.children.length + 1}</legend>
        <label>Product
          <input name="productSearch" type="search" list="saleProductOptions" placeholder="Search code, name, size" autocomplete="off" required id="${rowId}-product">
        </label>
        <label>Qty
          <input name="quantitySold" type="number" min="1" step="1" required value="1" id="${rowId}-qty">
        </label>
        <label>Price
          <input name="salePrice" type="number" min="0" step="0.01" required id="${rowId}-price">
        </label>
        <button class="icon-text-button" type="button" data-action="remove-sale-item">Remove</button>
      </fieldset>
    `
  );
  syncSaleItemRemoveButtons();
}

function handleSaleItemsClick(event) {
  const removeButton = event.target.closest('[data-action="remove-sale-item"]');

  if (!removeButton) return;

  removeButton.closest('.sale-item-row').remove();
  renumberSaleItems();
  syncSaleItemRemoveButtons();
}

function renumberSaleItems() {
  els.saleItems.querySelectorAll('.sale-item-row legend').forEach((legend, index) => {
    legend.textContent = `Item ${index + 1}`;
  });
}

function syncSaleItemRemoveButtons() {
  const rows = els.saleItems.querySelectorAll('.sale-item-row');

  rows.forEach((row) => {
    row.querySelector('[data-action="remove-sale-item"]').disabled = rows.length === 1;
  });
}

function saleSharedFields() {
  return {
    paymentMethod: els.saleForm.elements.paymentMethod.value,
    customerName: els.saleForm.elements.customerName.value,
    staffName: els.saleForm.elements.staffName.value,
    receiptRef: els.saleForm.elements.receiptRef.value,
    notes: els.saleForm.elements.notes.value,
    confirmNegativeStock: Boolean(els.saleForm.elements.confirmNegativeStock.checked)
  };
}

function stockCountLabel(product) {
  return `${product.productCode} - ${product.productName} - ${product.size || 'N/A'} - Current ${product.quantity ?? 'Uncounted'}`;
}

function resetSaleForm() {
  const soldBy = els.saleForm.elements.staffName.value;
  els.saleForm.reset();
  els.saleForm.elements.staffName.value = soldBy || 'Mark';
  els.saleItems.innerHTML = '';
  addSaleItemRow();
}

function handleNavigationClick(event) {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  setTab(tab.dataset.tab);
}

function renderNavigation() {
  els.primaryNav.innerHTML = renderPrimaryNavigation(state.activeTab);
}

function setTab(tabName) {
  state.activeTab = tabName;
  renderNavigation();
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabName);
  });
}

async function api(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (shouldRedirectToAccess({ status: response.status, error: payload.error })) {
    redirectToAccess();
    throw new Error('App access required.');
  }
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}

function redirectToAccess() {
  window.location.href = appAccessRedirectUrl(
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
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
  els.toast.textContent = toClientMessage(message);
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
