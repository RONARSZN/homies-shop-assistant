# TODO

Phased next steps for the Homies internal shop tool.

## Current Priority

Phase 1: Vercel staging with a copied/test spreadsheet and app access password.

## Phase 1: Staging Safety

- [ ] Keep Vercel staging pointed at a copied/test Google Spreadsheet only.
- [ ] Confirm `APP_ACCESS_PASSWORD` is set before any public staging link is shared.
- [ ] Confirm `STOCK_COUNT_PASSWORD` is set before baseline stock count testing.
- [ ] Confirm `FRONT_DESK_PASSWORD` is set before pending-sale verification testing.
- [ ] Run `npm test` before each staging deployment.
- [ ] Run `npm run check:sheets` against the copied/test spreadsheet before staging tests.
- [ ] Confirm `/api/health` works after deploy.
- [ ] Test one low-risk sale in staging and verify:
  - [ ] Sale tab writes only to `PENDING SALES`.
  - [ ] Sale tab does not write to `SALES`.
  - [ ] Sale tab does not change `CURRENT INVENTORY`.
  - [ ] Front Desk verification writes only to `SALES`, `CURRENT INVENTORY`, and matching status columns in `PENDING SALES`.
  - [ ] Inventory movement visuals update only after Front Desk verification.
  - [ ] `ITEM CODES and SRPs` is not changed by sale submission or verification.
- [ ] Test one pending-sale cancellation in staging and verify:
  - [ ] Cancel requires `FRONT_DESK_PASSWORD` again.
  - [ ] Cancel requires a cancel reason.
  - [ ] Pending row is marked canceled in `PENDING SALES`.
  - [ ] Cancellation details append only to `CANCELED SALES`.
  - [ ] `SALES`, `CURRENT INVENTORY`, and `ITEM CODES and SRPs` are not changed by pending cancellation.
- [ ] Test one manual inventory adjustment and verify:
  - [ ] Quantity changes only in `CURRENT INVENTORY`.
  - [ ] Log row appends only to `ADJUSTMENTS`.
  - [ ] `ITEM CODES and SRPs` is not changed.
- [ ] Test one baseline Stock Count save and verify:
  - [ ] It requires `STOCK_COUNT_PASSWORD`.
  - [ ] It updates only `Verified Quantity`, `Last Counted At`, and provided `Notes` in `CURRENT INVENTORY`.
  - [ ] It does not write to `SALES`, `ADJUSTMENTS`, or `ITEM CODES and SRPs`.
- [ ] Keep `WHATSAPP_ENABLED=false` during normal staging tests.

## Phase 2: Spreadsheet Readiness

- [ ] Review copied/test spreadsheet tabs against the approved write boundaries.
- [ ] Confirm old inventory tabs are treated as reference only.
- [ ] Confirm disallowed sheets are not touched:
  - [ ] `CASHOUT or EXPENSE`.
  - [ ] All `INDIO...` sheets.
  - [ ] `JET PILOT`.
  - [ ] `STOKED`.
- [ ] Confirm Front Desk verified sale rows keep this format:
  - [ ] Column A: Month.
  - [ ] Column B: Date.
  - [ ] Column C: Product Code.
  - [ ] Column D: Quantity.
  - [ ] Column E: Amount.
  - [ ] Column F: Customer Name.
  - [ ] Column G: Staff/Seller name only.
- [ ] Confirm pending-sale cancellations write only to `PENDING SALES` and `CANCELED SALES`.
- [ ] Confirm inventory movement visuals use verified official `SALES` only and exclude pending sales.
- [ ] Confirm generated reports write only to `REPORT...` tabs.

## Phase 3: WhatsApp Diagnostics

- [ ] Do not send live WhatsApp test messages without Mark's explicit approval.
- [ ] If testing is approved, use approved Meta test details only.
- [ ] Keep tokens and phone numbers out of logs, screenshots, docs, and commits.
- [ ] Confirm WhatsApp failure does not block sale logging.
- [ ] Document whether free-form messages are accepted or whether approved templates are required.

## Phase 4: Live Deployment Approval

- [ ] Get Mark's explicit approval before pointing any deployment at the original spreadsheet.
- [ ] Confirm production environment variables contain no test spreadsheet ID by mistake.
- [ ] Confirm access gate is enabled.
- [ ] Run `npm test`.
- [ ] Run `npm run check:sheets` against the approved target spreadsheet.
- [ ] Perform one approved low-risk live sale test.
- [ ] Confirm live sale submission writes only to `PENDING SALES`.
- [ ] Confirm Front Desk verification writes only to `SALES!A:G`, the matching `CURRENT INVENTORY` quantity, and matching `PENDING SALES` status columns.
- [ ] Confirm WhatsApp is either disabled or explicitly approved for live use.

## Later Improvements

- [ ] Add a safer staging checklist to the app UI if staff will help test.
- [ ] Add clearer report-generation status messages.
- [ ] Replace the Social placeholder only when real social tracking data is available.
- [ ] Decide whether product catalog editing needs stronger permissions than the current editor password.
- [ ] Decide whether WhatsApp should use approved templates instead of free-form sale messages.
