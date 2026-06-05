export function saleSearchLabel(product) {
  return [
    product.productCode,
    product.productName,
    `Size ${product.size || 'N/A'}`,
    peso(product.srp),
    stockLabel(product.quantity)
  ].join(' - ');
}

export function findProductBySaleSearchLabel(products, value) {
  const normalizedValue = normalize(value);

  return (
    products
      .filter((product) => product.active)
      .find((product) => normalize(saleSearchLabel(product)) === normalizedValue) ||
    null
  );
}

function stockLabel(quantity) {
  return quantity === null ? 'Uncounted' : `Stock ${quantity}`;
}

function peso(value) {
  return new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0
  }).format(value || 0).replace(/^/, 'PHP ');
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}
