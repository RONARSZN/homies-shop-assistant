import { hasGoogleConfig } from '../server/config.js';
import { getProducts, getSales, getSetupStatus } from '../server/services/shopService.js';
import { summarizeSheetsReadiness } from '../server/services/sheetsReadiness.js';

async function main() {
  if (!hasGoogleConfig()) {
    throw new Error(
      'Google Sheets credentials are missing. Copy .env.example to .env and fill in the service account values.'
    );
  }

  const [setup, products, sales] = await Promise.all([
    getSetupStatus(),
    getProducts(),
    getSales()
  ]);
  const summary = summarizeSheetsReadiness({
    setup,
    productCount: products.length,
    salesCount: sales.length
  });

  console.log(JSON.stringify(summary, null, 2));

  if (summary.missingSetupSheets.length) {
    console.log(
      `Missing setup sheets: ${summary.missingSetupSheets.join(', ')}. Use Create Sheets after backing up the spreadsheet.`
    );
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
