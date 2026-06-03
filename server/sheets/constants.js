export const SHEETS = {
  products: 'ITEM CODES and SRPs',
  sales: 'SALES',
  currentInventory: 'CURRENT INVENTORY',
  adjustments: 'ADJUSTMENTS'
};

export const PRODUCT_RANGE = `'${SHEETS.products}'!A3:I1202`;
export const SALES_RANGE = `'${SHEETS.sales}'!A5:G1003`;
export const CURRENT_INVENTORY_RANGE = `'${SHEETS.currentInventory}'!A1:J2000`;
export const ADJUSTMENTS_RANGE = `'${SHEETS.adjustments}'!A1:K2000`;

export const CURRENT_INVENTORY_HEADERS = [
  'SKU ID',
  'Product Code',
  'Product Name',
  'Size',
  'SRP',
  'Verified Quantity',
  'Low Stock Threshold',
  'Last Counted At',
  'Notes',
  'Active'
];

export const ADJUSTMENTS_HEADERS = [
  'Date',
  'SKU ID',
  'Product Code',
  'Product Name',
  'Size',
  'Quantity Before',
  'Quantity After',
  'Adjustment Amount',
  'Reason',
  'Staff Name',
  'Notes'
];
