export function normalizeSale(input) {
  const items = Array.isArray(input.items) && input.items.length
    ? input.items
    : [
        {
          skuId: input.skuId,
          quantitySold: input.quantitySold,
          salePrice: input.salePrice
        }
      ];

  return {
    date: input.date || manilaDate(),
    discount: input.discount || '',
    paymentMethod: input.paymentMethod || '',
    customerName: input.customerName || '',
    staffName: input.staffName || '',
    notes: input.notes || '',
    receiptRef: input.receiptRef || '',
    confirmNegativeStock: Boolean(input.confirmNegativeStock),
    items: items.map((item) => ({
      skuId: item.skuId,
      quantitySold: Number(item.quantitySold),
      salePrice: Number(item.salePrice)
    }))
  };
}

export function buildSaleLines({ sale, products }) {
  const quantitiesBySku = new Map();

  for (const item of sale.items) {
    if (!item.skuId) throw new Error('Product is required.');
    if (!Number.isFinite(item.quantitySold) || item.quantitySold <= 0) {
      throw new Error('Quantity sold must be greater than zero.');
    }
    if (!Number.isFinite(item.salePrice) || item.salePrice < 0) {
      throw new Error('Sale price is required.');
    }

    quantitiesBySku.set(
      item.skuId,
      (quantitiesBySku.get(item.skuId) || 0) + item.quantitySold
    );
  }

  for (const [skuId, quantitySold] of quantitiesBySku.entries()) {
    const product = products.find((item) => item.skuId === skuId);

    if (!product) throw new Error('Product was not found.');
    if (product.quantity === null) {
      throw new Error('This product has not been physically counted yet.');
    }
    if (product.quantity - quantitySold < 0 && !sale.confirmNegativeStock) {
      throw new Error('Sale would make stock negative.');
    }
  }

  const runningStockBySku = new Map(
    products.map((product) => [product.skuId, product.quantity])
  );

  return {
    lines: sale.items.map((item) => {
      const product = products.find((candidate) => candidate.skuId === item.skuId);
      const stockLeft = runningStockBySku.get(item.skuId) - item.quantitySold;
      runningStockBySku.set(item.skuId, stockLeft);

      return { item, product, stockLeft };
    })
  };
}

function manilaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
