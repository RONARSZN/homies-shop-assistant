const DAY_MS = 24 * 60 * 60 * 1000;

export function buildInventoryMovementSummary({
  products = [],
  sales = [],
  referenceDate = manilaDate(),
  dayCount = 30,
  limit = 10
} = {}) {
  const dates = lastNDates(referenceDate, dayCount);
  const dateSet = new Set(dates);
  const dailyByDate = new Map(
    dates.map((date) => [date, { date, units: 0, salesAmount: 0 }])
  );
  const productsByCode = new Map(products.map((product) => [product.productCode, product]));
  const byProduct = new Map();

  for (const sale of sales.filter((sale) => isOfficialSaleInRange(sale, dateSet))) {
    const daily = dailyByDate.get(sale.date);
    const quantity = Number(sale.quantity) || 0;
    const amount = Number(sale.amount) || 0;

    daily.units += quantity;
    daily.salesAmount += amount;

    const product = productsByCode.get(sale.productCode) || {};
    const current = byProduct.get(sale.productCode) || {
      productCode: sale.productCode,
      productName: product.productName || sale.productCode,
      size: product.size || '',
      units: 0,
      salesAmount: 0
    };

    current.units += quantity;
    current.salesAmount += amount;
    byProduct.set(sale.productCode, current);
  }

  const movingProducts = [...byProduct.values()]
    .filter((item) => item.units > 0 || item.salesAmount > 0);
  const topByUnits = [...movingProducts]
    .sort((a, b) => b.units - a.units || b.salesAmount - a.salesAmount)
    .slice(0, limit);
  const topBySales = [...movingProducts]
    .sort((a, b) => b.salesAmount - a.salesAmount || b.units - a.units)
    .slice(0, limit);

  return {
    rangeStart: dates[0],
    rangeEnd: dates.at(-1),
    totalUnits: movingProducts.reduce((sum, item) => sum + item.units, 0),
    totalSalesAmount: movingProducts.reduce((sum, item) => sum + item.salesAmount, 0),
    productsWithMovement: movingProducts.length,
    bestMovingProduct: topByUnits[0] || null,
    daily: [...dailyByDate.values()],
    topByUnits,
    topBySales
  };
}

function isOfficialSaleInRange(sale, dateSet) {
  return (
    !sale.pendingId &&
    !sale.status &&
    Boolean(sale.date) &&
    dateSet.has(sale.date) &&
    Number(sale.quantity) > 0 &&
    Number(sale.amount) >= 0
  );
}

function lastNDates(referenceDate, dayCount) {
  const end = parseDate(referenceDate);
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(end.getTime() - (dayCount - index - 1) * DAY_MS);
    return date.toISOString().slice(0, 10);
  });
}

function parseDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function manilaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
