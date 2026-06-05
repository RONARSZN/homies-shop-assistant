import { SHEETS } from '../sheets/constants.js';

export function summarizeSheetsReadiness({ setup, productCount, salesCount }) {
  const missingSetupSheets = [];

  if (!setup.hasCurrentInventory) {
    missingSetupSheets.push(SHEETS.currentInventory);
  }

  if (!setup.hasAdjustments) {
    missingSetupSheets.push(SHEETS.adjustments);
  }

  return {
    spreadsheetTitle: setup.spreadsheetTitle,
    spreadsheetTimeZone: setup.spreadsheetTimeZone,
    productCount,
    salesCount,
    hasCurrentInventory: setup.hasCurrentInventory,
    hasAdjustments: setup.hasAdjustments,
    missingSetupSheets
  };
}
