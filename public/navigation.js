export const NAV_SECTIONS = [
  {
    label: 'Sales',
    tabs: [
      { id: 'sale', label: 'Log Sale' },
      { id: 'front-desk', label: 'Front Desk' }
    ]
  },
  {
    label: 'Inventory',
    tabs: [
      { id: 'inventory', label: 'Inventory' },
      { id: 'stock-count', label: 'Stock Count' },
      { id: 'adjust', label: 'Adjust' }
    ]
  },
  {
    label: 'Insights',
    tabs: [
      { id: 'analytics', label: 'Analytics' },
      { id: 'reports', label: 'Reports' },
      { id: 'social', label: 'Social' }
    ]
  }
];

export function renderPrimaryNavigation(activeTab) {
  return NAV_SECTIONS.map((section) => `
    <div class="nav-section" data-section="${escapeHtml(section.label)}">
      <span class="nav-section-label">${escapeHtml(section.label)}</span>
      <div class="sub-tabs">
        ${section.tabs.map((tab) => `
          <button class="tab${tab.id === activeTab ? ' active' : ''}" data-tab="${escapeHtml(tab.id)}" type="button">
            ${escapeHtml(tab.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
