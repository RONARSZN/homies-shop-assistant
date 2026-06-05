export function buildSaleSummaryMessage({ sale, product, stockLeft }) {
  return [
    'Sale logged:',
    sale.date,
    product.productCode,
    `Qty: ${sale.quantitySold}`,
    `Price:  ${peso(sale.salePrice)}`,
    `Customer: ${sale.customerName || ''}`,
    `Sold by: ${sale.staffName || ''}`,
    `Payment: ${sale.paymentMethod || ''}`,
    `Stock Left: ${stockLeft}`
  ].join('\n');
}

export async function notifySaleLogged({
  sale,
  product,
  stockLeft,
  whatsappConfig,
  fetchImpl = fetch
}) {
  const messageType = 'text';

  if (!whatsappConfig?.enabled) {
    return {
      sent: false,
      skipped: true,
      debug: {
        enabled: false,
        messageType
      }
    };
  }

  validateConfig(whatsappConfig);

  const body = buildSaleSummaryMessage({ sale, product, stockLeft });
  const endpoint = buildMessagesEndpoint(whatsappConfig);
  const response = await fetchImpl(
    endpoint,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${whatsappConfig.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: whatsappConfig.toNumber,
        type: messageType,
        text: {
          preview_url: false,
          body
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));
  const sanitizedPayload = sanitizeMetaResponse(payload, whatsappConfig.accessToken);
  const debug = buildWhatsAppDebug({
    endpoint,
    httpStatus: response.status ?? (response.ok ? 200 : null),
    messageType,
    whatsappConfig,
    metaResponse: sanitizedPayload
  });

  if (!response.ok) {
    const error = new Error(toWhatsAppFailureMessage(sanitizedPayload.error));
    error.debug = debug;
    throw error;
  }

  return {
    sent: true,
    messageId: payload.messages?.[0]?.id || '',
    response: payload,
    debug
  };
}

export function toWhatsAppFailureMessage(error) {
  const message = String(error?.message || '').trim();
  const lower = message.toLowerCase();
  const code = Number(error?.code);

  if (code === 190 || lower.includes('access token')) {
    return 'WhatsApp access token is expired or invalid. Ask Mark to create a new Meta access token.';
  }

  if (
    code === 131047 ||
    lower.includes('re-engagement') ||
    lower.includes('outside the allowed window')
  ) {
    return 'WhatsApp cannot send this free-form message right now. The customer may need to message the business first, or this needs an approved template message.';
  }

  if (
    code === 131026 ||
    lower.includes('undeliverable') ||
    lower.includes('recipient')
  ) {
    return 'WhatsApp did not deliver the message. The recipient number may be wrong, unavailable, or not allowed in the Meta app test setup.';
  }

  if (
    code === 10 ||
    lower.includes('permission') ||
    lower.includes('unsupported post request')
  ) {
    return 'WhatsApp is not allowed to send from this Meta app or phone number. Ask Mark to check Meta permissions and the phone number ID.';
  }

  if (message) return `WhatsApp rejected the message: ${message}`;

  return 'WhatsApp rejected the message. Ask Mark to check the Meta app settings.';
}

function validateConfig(whatsappConfig) {
  const missing = [
    ['WHATSAPP_ACCESS_TOKEN', whatsappConfig.accessToken],
    ['WHATSAPP_PHONE_NUMBER_ID', whatsappConfig.phoneNumberId],
    ['WHATSAPP_TO_NUMBER', whatsappConfig.toNumber],
    ['WHATSAPP_GRAPH_VERSION', whatsappConfig.graphVersion]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing WhatsApp config: ${missing.join(', ')}`);
  }
}

function buildMessagesEndpoint(whatsappConfig) {
  return `https://graph.facebook.com/${whatsappConfig.graphVersion}/${whatsappConfig.phoneNumberId}/messages`;
}

function buildWhatsAppDebug({
  endpoint,
  httpStatus,
  messageType,
  whatsappConfig,
  metaResponse
}) {
  const debug = {
    endpoint,
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : null,
    messageType,
    toNumber: maskFromEnd(whatsappConfig.toNumber, 4),
    phoneNumberId: maskFromEnd(whatsappConfig.phoneNumberId, 4),
    metaResponse
  };

  if (messageType === 'text') {
    debug.diagnosticNote =
      'This app sends free-form text. If Meta rejects the message, business-initiated WhatsApp messages may require an approved WhatsApp template.';
  }

  return debug;
}

function sanitizeMetaResponse(value, accessToken) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetaResponse(item, accessToken));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeMetaResponse(item, accessToken)
      ])
    );
  }

  if (typeof value === 'string') {
    return accessToken ? value.replaceAll(accessToken, '[redacted]') : value;
  }

  return value;
}

function maskFromEnd(value, visibleDigits) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= visibleDigits) return '*'.repeat(text.length);
  return `${'*'.repeat(text.length - visibleDigits)}${text.slice(-visibleDigits)}`;
}

function peso(value) {
  return `PHP ${new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0
  }).format(value || 0)}`;
}
