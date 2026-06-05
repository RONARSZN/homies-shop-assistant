import 'dotenv/config';
import { google } from 'googleapis';

const sourceSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const title = `HOMIES PROSHOP Monitoring 2026 - Vercel Phase 1 Staging ${new Date()
  .toISOString()
  .slice(0, 10)}`;

if (!sourceSpreadsheetId || !serviceAccountEmail || !privateKey) {
  throw new Error('Google Sheets environment variables are not configured.');
}

const auth = new google.auth.JWT({
  email: serviceAccountEmail,
  key: privateKey,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

try {
  const source = await sheets.spreadsheets.get({
    spreadsheetId: sourceSpreadsheetId,
    fields: 'properties.title,sheets.properties(sheetId,title,index)'
  });

  const copiedFile = await drive.files.copy({
    fileId: sourceSpreadsheetId,
    requestBody: {
      name: title
    },
    fields: 'id,name,mimeType',
    supportsAllDrives: true
  });

  const stagingSpreadsheetId = copiedFile.data.id;
  const copied = await sheets.spreadsheets.get({
    spreadsheetId: stagingSpreadsheetId,
    fields: 'sheets.properties(sheetId,title,index)'
  });

  console.log(JSON.stringify({
    ok: true,
    sourceTitle: source.data.properties.title,
    stagingTitle: title,
    stagingSpreadsheetId,
    copiedSheets: copied.data.sheets?.length || 0
  }));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error.message
  }));
  process.exitCode = 1;
}
