export function toUserFacingError(error) {
  const message = String(error?.message || error || '').trim();
  const lower = message.toLowerCase();

  if (!message) return 'Something went wrong. Please try again.';

  if (
    lower.includes('www.googleapis.com') &&
    (lower.includes('enotfound') ||
      lower.includes('etimedout') ||
      lower.includes('econnreset') ||
      lower.includes('fetch failed') ||
      lower.includes('request to'))
  ) {
    return 'The app cannot connect to Google Sheets right now. Check the internet connection, then try again.';
  }

  if (lower.includes('google sheets environment variables are not configured')) {
    return 'Google Sheets is not set up yet. Ask Mark to check the app settings.';
  }

  if (lower.includes('invalid_grant') || lower.includes('private_key')) {
    return 'Google Sheets login is not working. Ask Mark to check the service account details.';
  }

  if (lower.includes('permission') && lower.includes('google')) {
    return 'The app does not have permission to open the Google Sheet. Share the sheet with the service account email, then try again.';
  }

  if (lower.includes('sku is missing from current inventory')) {
    return 'This item is not in the Current Inventory sheet yet. Run setup or add the item there before adjusting stock.';
  }

  if (looksTechnical(message)) {
    return 'Something went wrong in the app. Please try again, then ask Mark to check the app logs if it still happens.';
  }

  return message;
}

function looksTechnical(message) {
  return [
    /\bENOTFOUND\b/i,
    /\bECONNRESET\b/i,
    /\bETIMEDOUT\b/i,
    /\bE[A-Z]{2,}\b/,
    /https?:\/\//i,
    /\b(node|stack|module|undefined|null is not|is not defined)\b/i
  ].some((pattern) => pattern.test(message));
}
