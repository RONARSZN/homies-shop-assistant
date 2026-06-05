export function toClientMessage(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  if (!text) return 'Something went wrong. Please try again.';

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'The app cannot reach the server right now. Check that the app is running, then try again.';
  }

  if (lower.includes('unexpected token') || lower.includes('json')) {
    return 'The app received an unexpected response. Refresh the page and try again.';
  }

  if (looksTechnical(text)) {
    return 'Something went wrong in the app. Please try again, then ask Mark to check it if it still happens.';
  }

  return text;
}

function looksTechnical(text) {
  return [
    /\bENOTFOUND\b/i,
    /\bECONNRESET\b/i,
    /\bETIMEDOUT\b/i,
    /\bE[A-Z]{2,}\b/,
    /https?:\/\//i,
    /\b(undefined|null is not|is not defined|stack|module)\b/i
  ].some((pattern) => pattern.test(text));
}
