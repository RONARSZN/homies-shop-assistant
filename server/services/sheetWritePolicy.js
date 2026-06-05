const ACTIONS = new Set([
  'sale-submit',
  'front-desk-verify',
  'front-desk-cancel',
  'adjustment',
  'stock-count',
  'setup',
  'report',
  'product-management'
]);

export function assertCanAppend(action, range) {
  assertKnownAction(action);
  assertApproved(action, 'append', range);
}

export function assertCanUpdate(action, range) {
  assertKnownAction(action);
  assertApproved(action, 'update', range);
}

export function assertCanClear(action, range) {
  assertKnownAction(action);
  assertApproved(action, 'clear', range);
}

export function assertCanEnsureSheet(action, title) {
  assertKnownAction(action);

  const allowed =
    (action === 'setup' &&
      ['CURRENT INVENTORY', 'ADJUSTMENTS', 'PENDING SALES', 'CANCELED SALES'].includes(title)) ||
    (action === 'report' && isReportTitle(title));

  if (!allowed) {
    throw new Error(`${action} sheet creation is not approved for ${title}.`);
  }
}

function assertKnownAction(action) {
  if (!ACTIONS.has(action)) {
    throw new Error(`Unknown sheet write action: ${action}.`);
  }
}

function assertApproved(action, operation, range) {
  if (isApproved(action, operation, range)) return;
  throw new Error(`${action} ${operation} is not approved for ${range}.`);
}

function isApproved(action, operation, range) {
  if (action === 'sale-submit') {
    return operation === 'append' && range === "'PENDING SALES'!A:P";
  }

  if (action === 'front-desk-verify') {
    return (
      (operation === 'update' && /^'SALES'!A\d+:G\d+$/.test(range)) ||
      (operation === 'update' && /^'CURRENT INVENTORY'!F\d+$/.test(range)) ||
      (operation === 'update' && /^'PENDING SALES'!M\d+:O\d+$/.test(range))
    );
  }

  if (action === 'front-desk-cancel') {
    return (
      (operation === 'update' && /^'PENDING SALES'!M\d+:P\d+$/.test(range)) ||
      (operation === 'append' && range === "'CANCELED SALES'!A:P")
    );
  }

  if (action === 'adjustment') {
    return (
      (operation === 'update' && /^'CURRENT INVENTORY'!F\d+$/.test(range)) ||
      (operation === 'append' && range === "'ADJUSTMENTS'!A:K")
    );
  }

  if (action === 'stock-count') {
    return (
      operation === 'update' &&
      /^'CURRENT INVENTORY'![FHI]\d+$/.test(range)
    );
  }

  if (action === 'setup') {
    return (
      (operation === 'append' && range === "'CURRENT INVENTORY'!A:J") ||
      (operation === 'update' && range === "'CURRENT INVENTORY'!A1:J1") ||
      (operation === 'update' && range === "'ADJUSTMENTS'!A1:K1") ||
      (operation === 'update' && range === "'PENDING SALES'!A1:P1") ||
      (operation === 'update' && range === "'CANCELED SALES'!A1:P1")
    );
  }

  if (action === 'report') {
    return (
      ['clear', 'update'].includes(operation) &&
      /^'REPORT[^']*'!/.test(range)
    );
  }

  if (action === 'product-management') {
    return (
      operation === 'update' &&
      (/^'ITEM CODES and SRPs'![A-Z]+\d+(?::[A-Z]+\d+)?$/.test(range) ||
        /^'CURRENT INVENTORY'!E\d+$/.test(range))
    );
  }

  return false;
}

function isReportTitle(title) {
  return /^REPORT\b/.test(title);
}
