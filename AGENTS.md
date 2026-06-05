# Homies Internal Shop Tool Agent Instructions

This project is the Homies internal shop tool for Homies Approved / Homies Proshop.

Treat this as an operations tool, not a demo app. It connects to the original Google Spreadsheet used by the business. Any write operation against the production spreadsheet changes the real spreadsheet.

## Spreadsheet Write Rules

Only write to these Google Sheets areas when the action explicitly matches the allowed purpose:

- `SALES!A:G`: Front Desk verified sale rows only.
- `CURRENT INVENTORY`: app-managed stock and baseline stock counts only.
- `ADJUSTMENTS`: manual inventory adjustment logs only.
- `PENDING SALES`: app-entered pending sale rows and pending item status updates only.
- `CANCELED SALES`: Front Desk pending-sale cancellation logs only.
- `ITEM CODES and SRPs`: explicit product-catalog management actions only.
- `REPORT...` tabs: generated reports only.

Do not write to:

- old inventory sheets
- cashout or expense sheets
- Indio sheets
- Jet Pilot / Stoked sheets
- headers, totals, formulas, old rows, or non-approved ranges

Before changing any spreadsheet-related code, inspect every write path and confirm the target sheet, range, and payload.

## Sales Rows

Sale submission from the Sale tab must write to `PENDING SALES` only. A sale is not official until Front Desk verifies it. Pending sales must not write to `SALES` and must not deduct `CURRENT INVENTORY`.

Front Desk verification must append rows only in this format:

- Column A: Month
- Column B: Date
- Column C: Product Code
- Column D: Quantity
- Column E: Amount
- Column F: Customer Name
- Column G: Staff/Seller name only

Sale submission and Front Desk verification must not modify `ITEM CODES and SRPs`.

## Inventory And Catalog Separation

Inventory adjustments must not modify `ITEM CODES and SRPs`.

Stock Count is for baseline true stock entry. It must stay separate from manual inventory adjustments, write only to `CURRENT INVENTORY`, and require `STOCK_COUNT_PASSWORD`.

Product catalog edits must be kept separate from inventory adjustment. Do not combine product-code, SRP, or catalog changes with stock adjustment flows.

## Front Desk Rules

Front Desk requires `FRONT_DESK_PASSWORD`. Unlock may last for the browser session, but pending-sale cancel actions must ask for `FRONT_DESK_PASSWORD` again and require a cancel reason.

Verifying a pending item may write only to `SALES`, `CURRENT INVENTORY`, and the matching status/action columns in `PENDING SALES`.

Canceling a pending item may write only to `PENDING SALES` and `CANCELED SALES`.

## Vercel Staging Rules

- Staging must use a copied/test spreadsheet.
- Do not point staging to the original spreadsheet until Mark explicitly approves it.
- Use environment variables only for configuration and secrets.
- Require `APP_ACCESS_PASSWORD` or an equivalent access gate before public testing.

## WhatsApp Rules

- Keep sale logging non-blocking if WhatsApp fails.
- Never expose WhatsApp tokens, API keys, spreadsheet credentials, or other secrets.
- Do not send live WhatsApp test messages unless Mark explicitly approves them.

## Coding Defaults

- Use Node.js for scripts, APIs, and automation.
- Use Express only where a persistent server is needed.
- Prefer Vercel/serverless-first architecture.
- Keep dependencies light.
- Keep secrets only in environment variables.
- Write clean, modular code with minimal comments.

## Verification

- Inspect write paths before changing spreadsheet-related code.
- Add or update tests for Google Sheets write boundaries.
- Run tests before claiming work is complete.
- Do not make live Google Sheets writes unless Mark explicitly approves them or the target is a copied/test spreadsheet.
