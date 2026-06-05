export function shouldRedirectToAccess({ status, error }) {
  return status === 401 && String(error || '').trim() === 'App access required.';
}

export function appAccessRedirectUrl(returnTo = '/') {
  const safeReturnTo = safeAppPath(returnTo);
  return safeReturnTo === '/' || safeReturnTo === '/access'
    ? '/access'
    : `/access?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

function safeAppPath(value) {
  const path = String(value || '/');
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}
