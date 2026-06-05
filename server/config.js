import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  shopPassword:
  appAccessPassword: process.env.APP_ACCESS_PASSWORD || '',
  itemEditorPassword: process.env.ITEM_EDITOR_PASSWORD || '',
  stockCountPassword: process.env.STOCK_COUNT_PASSWORD || '',
  frontDeskPassword: process.env.FRONT_DESK_PASSWORD || '',
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    toNumber: process.env.WHATSAPP_TO_NUMBER,
    graphVersion: (process.env.WHATSAPP_GRAPH_VERSION || 'v24.0').toLowerCase()
  }
};

export function hasGoogleConfig() {
  return Boolean(
    config.spreadsheetId &&
      config.googleServiceAccountEmail &&
      config.googlePrivateKey
  );
}
