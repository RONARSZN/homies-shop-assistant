export function buildReports(products, sales) {
  return [
    {
      title: 'REPORT CURRENT INVENTORY',
      rows: [
        inventoryHeader(),
        ...products.map((product) => inventoryRow(product))
      ]
    },
    {
      title: 'REPORT LOW STOCK',
      rows: [
        inventoryHeader(),
        ...products
          .filter((product) => product.stockStatus === 'low-stock')
          .map((product) => inventoryRow(product))
      ]
    },
    {
      title: 'REPORT SOLD OUT',
      rows: [
        inventoryHeader(),
        ...products
          .filter((product) => product.stockStatus === 'sold-out')
          .map((product) => inventoryRow(product))
      ]
    },
    {
      title: 'REPORT DAILY SALES',
      rows: salesSummaryRows(groupSales(sales, (sale) => sale.date))
    },
    {
      title: 'REPORT WEEKLY SALES',
      rows: salesSummaryRows(groupSales(sales, (sale) => weekKey(sale.date)))
    },
    {
      title: 'REPORT MONTHLY SALES',
      rows: salesSummaryRows(groupSales(sales, (sale) => sale.date.slice(0, 7)))
    },
    {
      title: 'REPORT BEST SELLERS',
      rows: bestSellerRows(sales)
    },
    {
      title: 'REPORT SLOW MOVING',
      rows: slowMovingRows(products, sales)
    },
    {
      title: 'REPORT RESTOCK WATCH',
      rows: [
        inventoryHeader(),
        ...products
          .filter((product) =>
            ['low-stock', 'sold-out'].includes(product.stockStatus)
          )
          .map((product) => inventoryRow(product))
      ]
    }
  ];
}

export function groupSales(sales, keyFn) {
  const groups = new Map();

  for (const sale of sales) {
    if (!sale.date) continue;
    const key = keyFn(sale);
    const current = groups.get(key) || { period: key, units: 0, sales: 0 };
    current.units += sale.quantity;
    current.sales += sale.amount;
    groups.set(key, current);
  }

  return [...groups.values()].sort((a, b) => a.period.localeCompare(b.period));
}

function salesSummaryRows(groups) {
  return [
    ['Period', 'Units Sold', 'Total Sales'],
    ...groups.map((group) => [group.period, group.units, group.sales])
  ];
}

function bestSellerRows(sales) {
  const byCode = new Map();

  for (const sale of sales) {
    const current = byCode.get(sale.productCode) || {
      productCode: sale.productCode,
      units: 0,
      sales: 0
    };
    current.units += sale.quantity;
    current.sales += sale.amount;
    byCode.set(sale.productCode, current);
  }

  return [
    ['Product Code', 'Units Sold', 'Total Sales'],
    ...[...byCode.values()]
      .sort((a, b) => b.units - a.units)
      .map((item) => [item.productCode, item.units, item.sales])
  ];
}

function slowMovingRows(products, sales) {
  const soldCodes = new Set(sales.map((sale) => sale.productCode));

  return [
    inventoryHeader(),
    ...products
      .filter((product) => product.quantity > 0)
      .filter((product) => !soldCodes.has(product.productCode))
      .map((product) => inventoryRow(product))
  ];
}

function inventoryHeader() {
  return [
    'Product Code',
    'Product Name',
    'Category',
    'Size',
    'SRP',
    'Quantity',
    'Status',
    'Last Counted At'
  ];
}

function inventoryRow(product) {
  return [
    product.productCode,
    product.productName,
    product.category,
    product.size,
    product.srp ?? '',
    product.quantity ?? '',
    product.stockStatus,
    product.lastCountedAt || ''
  ];
}

function weekKey(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  const firstDay = new Date(Date.UTC(parsed.getUTCFullYear(), 0, 1));
  const dayOffset = Math.floor((parsed - firstDay) / 86400000);
  const week = Math.ceil((dayOffset + firstDay.getUTCDay() + 1) / 7);
  return `${parsed.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
