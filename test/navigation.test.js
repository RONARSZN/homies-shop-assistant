import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  NAV_SECTIONS,
  renderPrimaryNavigation
} from '../public/navigation.js';

test('navigation grouping renders expected sections and sub-tabs', () => {
  assert.deepEqual(
    NAV_SECTIONS.map((section) => ({
      label: section.label,
      tabs: section.tabs.map((tab) => tab.label)
    })),
    [
      { label: 'Sales', tabs: ['Log Sale', 'Front Desk'] },
      { label: 'Inventory', tabs: ['Inventory', 'Stock Count', 'Adjust'] },
      { label: 'Insights', tabs: ['Analytics', 'Reports', 'Social'] }
    ]
  );

  const html = renderPrimaryNavigation('inventory');
  assert.match(html, /data-section="Sales"/);
  assert.match(html, /data-tab="front-desk"/);
  assert.match(html, /data-tab="stock-count"/);
  assert.match(html, /data-tab="social"/);
});

test('existing protected sections keep their password fields', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /id="frontDeskUnlockForm"[\s\S]*name="password"/);
  assert.match(html, /id="stockCountForm"[\s\S]*name="password"/);
  assert.match(html, /id="adjustForm"[\s\S]*name="password"/);
});

test('header includes an app access action near refresh', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /class="header-actions"[\s\S]*id="appAccessButton"[\s\S]*id="refreshButton"/);
  assert.match(html, /id="appAccessButton"[\s\S]*Unlock/);
});
