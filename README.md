# HOMIES SHOP ASSISTANT

Mobile-first internal shop tool for Homies Approved / Homies Proshop.

## Current Status

Last verified: 2026-06-04

- Tests: passing with `npm test`
- Google Sheets check: passing with `npm run check:sheets`
- Live spreadsheet access: working
- `CURRENT INVENTORY`, `ADJUSTMENTS`, `PENDING SALES`, and `CANCELED SALES`: created
- Google Sheets writes: guarded by action and approved tab/range
- User-facing errors: technical API and browser errors are translated into plain language
- WhatsApp notifications: disabled until Meta Cloud API test message is confirmed
- Deployment: ready for Phase 1 Vercel staging setup using a copied/test spreadsheet only

Next checkpoint:

- Test one low-risk sale against a copied/test spreadsheet in Vercel staging and confirm it writes to `PENDING SALES` only, then verify it through Front Desk to write `SALES` and deduct `CURRENT INVENTORY`.

## What v1 Uses

- Product reference: `ITEM CODES and SRPs`
- Sales log: `SALES`
- Pending sale queue: `PENDING SALES`
- Canceled pending sales: `CANCELED SALES`
- Verified stock count: `CURRENT INVENTORY`
- Manual changes: `ADJUSTMENTS`

The old inventory count tabs are not trusted for quantity. They are treated as reference only.

## Spreadsheet Write Boundaries

This is an operations tool connected to the business spreadsheet. Treat every production write as a real business change.

Approved write areas:

- `SALES!A:G`: Front Desk verified sale rows only.
- `CURRENT INVENTORY`: app-managed stock setup, baseline stock counts, and quantity updates only.
- `ADJUSTMENTS`: manual inventory adjustment logs only.
- `PENDING SALES`: pending sale rows and pending item status updates only.
- `CANCELED SALES`: Front Desk pending-sale cancellation logs only.
- `ITEM CODES and SRPs`: product-catalog edits only, such as SRP updates from the item editor.
- `REPORT...` tabs: generated reports only.

Disallowed write areas:

- `CASHOUT or EXPENSE`
- all `INDIO...` sheets
- `JET PILOT`
- `STOKED`
- old inventory tabs
- headers, totals, formulas, old rows, or any range not approved by the app write policy

Sale submission from the Sale tab writes to `PENDING SALES` only. A sale is not official until Front Desk verifies it. Pending sales do not count as sales and do not affect inventory.

Front Desk verification must keep the original `SALES` row format:

- Column A: Month
- Column B: Date
- Column C: Product Code
- Column D: Quantity
- Column E: Amount
- Column F: Customer Name
- Column G: Staff/Seller name only

Sale submission and Front Desk verification must not edit `ITEM CODES and SRPs`. Inventory adjustments must not edit `ITEM CODES and SRPs`. Stock Count is for baseline true stock entry only and writes only to `CURRENT INVENTORY`. Product catalog edits must stay separate from inventory adjustment and stock count flows.

## Setup

1. Create a Google Cloud service account with Google Sheets API access.
2. Share the Google Sheet with the service account email.
3. Copy `.env.example` to `.env`.
4. Fill in:

```env
GOOGLE_SPREADSHEET_ID=copied-test-spreadsheet-id-only
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APP_ACCESS_PASSWORD=choose-a-staging-access-password
FRONT_DESK_PASSWORD=choose-a-front-desk-password
```

Optional WhatsApp sale notifications:

```env
WHATSAPP_ENABLED=false
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TO_NUMBER=639171234567
WHATSAPP_GRAPH_VERSION=v24.0
```

`WHATSAPP_TO_NUMBER` should be digits only, country code included, no `+`, spaces, or dashes.

Keep `WHATSAPP_ENABLED=false` until the Meta WhatsApp Cloud API test message works. Sale logging still works if WhatsApp is disabled or if a notification fails.

WhatsApp testing rules:

- Do not send live WhatsApp test messages unless Mark explicitly approves the test.
- Keep sale logging non-blocking if WhatsApp fails.
- Use diagnostics only with redacted tokens and masked phone numbers.
- Free-form WhatsApp messages may be rejected by Meta outside the allowed messaging window. Template messages may be needed later.

Optional item editor password:

```env
ITEM_EDITOR_PASSWORD=choose-a-local-editor-password
```

The price checker is open to staff. The item editor requires this password before it can update SRP values in Google Sheets.

Optional stock count password:

```env
STOCK_COUNT_PASSWORD=choose-a-stock-count-password
```

The `Stock Count` section is for Phase 1 baseline true stock entry. Saving a count requires `STOCK_COUNT_PASSWORD` and may update only `Verified Quantity`, `Last Counted At`, and provided `Notes` in `CURRENT INVENTORY`.

`APP_ACCESS_PASSWORD` controls the simple app-wide access gate. Leave it empty only for local testing on your own machine. Set it for Vercel staging.

`FRONT_DESK_PASSWORD` unlocks the Front Desk tab for the browser session. Canceling pending items asks for this password again and requires a cancel reason.

5. Install dependencies:

```bash
npm install
```

6. Confirm the app can read the configured spreadsheet without writing to it:

```bash
npm run check:sheets
```

7. Start the app:

```bash
npm run dev
```

8. Open:

```text
http://localhost:3000
```

## Phone Testing

Run this in PowerShell to see your local network IP:

```powershell
ipconfig
```

Look for the IPv4 address on the same Wi-Fi network, then open this on your phone:

```text
http://YOUR-IP-ADDRESS:3000
```

Example:

```text
http://192.168.1.25:3000
```

## First Use

When the app opens, tap `Create Sheets`. This creates:

- `CURRENT INVENTORY`
- `ADJUSTMENTS`
- `PENDING SALES`
- `CANCELED SALES`

Then enter your physical count through the `Stock Count` section. The app treats `CURRENT INVENTORY` as the trusted quantity source.

## Important Behavior

- App-entered sales write to `PENDING SALES` first.
- Front Desk verification writes the official `SALES` row and deducts from `CURRENT INVENTORY`.
- Front Desk cancellation marks the pending row canceled and appends to `CANCELED SALES`; it does not write to `SALES` or deduct inventory.
- Inventory movement visuals use verified official `SALES` rows only. Pending sales are excluded from all movement graphs and summaries.
- Stock Count saves baseline true stock only to `CURRENT INVENTORY` and requires `STOCK_COUNT_PASSWORD`.
- Direct manual sales typed into Google Sheets are visible after refresh.
- Direct manual sales do not deduct stock automatically in v1.
- Reports generate new tabs in the same Google Sheet with names starting `REPORT`.
- Social is a placeholder until real social tracking is added.

This avoids double-counting while the physical count process is still being stabilized.

If port 3000 is already being used, start with another port:

```powershell
$env:PORT=3100; npm run dev
```

## Vercel Staging Deployment

Phase 1 staging must use a copied/test Google Spreadsheet only. Do not point Vercel staging at the original live spreadsheet.

1. Copy the Google Spreadsheet and share the copy with the service account email.
2. In Vercel, set these environment variables for the staging project:

```env
GOOGLE_SPREADSHEET_ID=copied-test-spreadsheet-id-only
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APP_ACCESS_PASSWORD=choose-a-staging-access-password
ITEM_EDITOR_PASSWORD=choose-an-editor-password-if-editing-is-tested
STOCK_COUNT_PASSWORD=choose-a-stock-count-password
FRONT_DESK_PASSWORD=choose-a-front-desk-password
WHATSAPP_ENABLED=false
```

3. Keep WhatsApp disabled unless you are deliberately testing WhatsApp Cloud API with approved test details.
4. Deploy the project to Vercel staging.
5. Confirm `/api/health` returns successfully, then unlock the app with `APP_ACCESS_PASSWORD`.

Do not switch staging to the original spreadsheet until Phase 2 approval.

## Live Deployment Checklist

Before any public or production-facing test:

- Use a copied/test spreadsheet for staging.
- Confirm `GOOGLE_SPREADSHEET_ID` points to the copied/test spreadsheet.
- Set `APP_ACCESS_PASSWORD` or an equivalent access gate.
- Set `STOCK_COUNT_PASSWORD` before testing baseline stock counts.
- Set `FRONT_DESK_PASSWORD` before testing pending-sale verification.
- Keep `WHATSAPP_ENABLED=false` unless Mark explicitly approves live WhatsApp testing.
- Run `npm test`.
- Run `npm run check:sheets` against the intended test spreadsheet.
- Confirm `/api/health` returns successfully after deploy.
- Test one low-risk sale in staging and confirm sale submission writes only to `PENDING SALES`, then Front Desk verification writes only to `SALES`, `CURRENT INVENTORY`, and the matching `PENDING SALES` status columns.
- Confirm reports write only to `REPORT...` tabs.
- Get Mark's explicit approval before pointing any deployment at the original spreadsheet.
