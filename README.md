# HOMIES SHOP ASSISTANT

Mobile-first internal shop tool for Homies Approved / Homies Proshop.

## What v1 Uses

- Product reference: `ITEM CODES and SRPs`
- Sales log: `SALES`
- Verified stock count: `CURRENT INVENTORY`
- Manual changes: `ADJUSTMENTS`

The old inventory count tabs are not trusted for quantity. They are treated as reference only.

Excluded from app scope:

- `CASHOUT or EXPENSE`
- all `INDIO...` sheets
- `JET PILOT`
- `STOKED`

## Setup

1. Create a Google Cloud service account with Google Sheets API access.
2. Share the Google Sheet with the service account email.
3. Copy `.env.example` to `.env`.
4. Fill in:

```env
GOOGLE_SPREADSHEET_ID=1chwtZaG7XE3d4u2m4lI_Dea2Zfq97tBaqdWH7J4uTHg
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

5. Install dependencies:

```bash
npm install
```

6. Start the app:

```bash
npm run dev
```

7. Open:

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

Then enter your physical count into `CURRENT INVENTORY`. The app treats that sheet as the trusted quantity source.

## Important Behavior

- App-entered sales write to `SALES`.
- App-entered sales deduct from `CURRENT INVENTORY`.
- Direct manual sales typed into Google Sheets are visible after refresh.
- Direct manual sales do not deduct stock automatically in v1.
- Reports generate new tabs in the same Google Sheet with names starting `REPORT`.

This avoids double-counting while the physical count process is still being stabilized.

If port 3000 is already being used, start with another port:

```powershell
$env:PORT=3100; npm run dev
```
