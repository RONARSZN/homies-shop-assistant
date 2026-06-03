import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

export function hasGoogleConfig() {
  return Boolean(
    config.spreadsheetId &&
      config.googleServiceAccountEmail &&
      config.googlePrivateKey
  );
}
