import { findProductBySaleSearchLabel } from './productSearch.js';

export function buildSalePayloadFromRows({ products, rows, sharedFields }) {
  return {
    ...sharedFields,
    items: rows.map((row) => {
      const product = findProductBySaleSearchLabel(products, row.productSearch);

      if (!product) {
        throw new Error('Choose a product from the search results.');
      }

      return {
        skuId: product.skuId,
        quantitySold: Number(row.quantitySold),
        salePrice: Number(row.salePrice)
      };
    })
  };
}
