import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSaleSummaryMessage,
  notifySaleLogged,
  toWhatsAppFailureMessage
} from '../server/services/whatsappNotifier.js';

test('buildSaleSummaryMessage uses the requested sale summary format', () => {
  const message = buildSaleSummaryMessage({
    sale: {
      date: '2026-06-04',
      quantitySold: 1,
      salePrice: 37000,
      customerName: 'Mark',
      staffName: 'Mark',
      paymentMethod: 'Cash'
    },
    product: {
      productCode: '26sap148'
    },
    stockLeft: 1
  });

  assert.equal(
    message,
    [
      'Sale logged:',
      '2026-06-04',
      '26sap148',
      'Qty: 1',
      'Price:  PHP 37,000',
      'Customer: Mark',
      'Sold by: Mark',
      'Payment: Cash',
      'Stock Left: 1'
    ].join('\n')
  );
});

test('notifySaleLogged skips sending when WhatsApp is disabled', async () => {
  let called = false;
  const result = await notifySaleLogged({
    sale: { date: '2026-06-04', quantitySold: 1, salePrice: 37000 },
    product: { productCode: '26sap148' },
    stockLeft: 1,
    whatsappConfig: { enabled: false },
    fetchImpl: async () => {
      called = true;
    }
  });

  assert.equal(called, false);
  assert.deepEqual(result, {
    sent: false,
    skipped: true,
    debug: {
      enabled: false,
      messageType: 'text'
    }
  });
});

test('notifySaleLogged posts text message to WhatsApp Cloud API', async () => {
  let request;
  const result = await notifySaleLogged({
    sale: {
      date: '2026-06-04',
      quantitySold: 1,
      salePrice: 37000,
      customerName: 'Mark',
      staffName: 'Mark',
      paymentMethod: 'Cash'
    },
    product: { productCode: '26sap148' },
    stockLeft: 1,
    whatsappConfig: {
      enabled: true,
      accessToken: 'token',
      phoneNumberId: '12345',
      toNumber: '639171234567',
      graphVersion: 'v24.0'
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ messages: [{ id: 'wamid.1' }] }) };
    }
  });

  assert.equal(result.sent, true);
  assert.equal(result.messageId, 'wamid.1');
  assert.equal(result.debug.endpoint, 'https://graph.facebook.com/v24.0/12345/messages');
  assert.equal(result.debug.httpStatus, 200);
  assert.equal(result.debug.messageType, 'text');
  assert.equal(result.debug.toNumber, '********4567');
  assert.equal(result.debug.phoneNumberId, '*2345');
  assert.equal(request.url, 'https://graph.facebook.com/v24.0/12345/messages');
  assert.equal(request.options.headers.Authorization, 'Bearer token');
  assert.deepEqual(JSON.parse(request.options.body), {
    messaging_product: 'whatsapp',
    to: '639171234567',
    type: 'text',
    text: {
      preview_url: false,
      body: [
        'Sale logged:',
        '2026-06-04',
        '26sap148',
        'Qty: 1',
        'Price:  PHP 37,000',
        'Customer: Mark',
        'Sold by: Mark',
        'Payment: Cash',
        'Stock Left: 1'
      ].join('\n')
    }
  });
});

test('toWhatsAppFailureMessage explains common Meta API failures clearly', () => {
  assert.equal(
    toWhatsAppFailureMessage({
      code: 190,
      message: 'Error validating access token: Session has expired.'
    }),
    'WhatsApp access token is expired or invalid. Ask Mark to create a new Meta access token.'
  );

  assert.equal(
    toWhatsAppFailureMessage({
      code: 131047,
      message: 'Re-engagement message'
    }),
    'WhatsApp cannot send this free-form message right now. The customer may need to message the business first, or this needs an approved template message.'
  );
});

test('notifySaleLogged returns a clear error when Meta rejects the message', async () => {
  let error;
  try {
    await notifySaleLogged({
      sale: { date: '2026-06-04', quantitySold: 1, salePrice: 37000 },
      product: { productCode: '26sap148' },
      stockLeft: 1,
      whatsappConfig: {
        enabled: true,
        accessToken: 'super-secret-token',
        phoneNumberId: '12345',
        toNumber: '639171234567',
        graphVersion: 'v24.0'
      },
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 131026,
            message: 'Message undeliverable'
          }
        })
      })
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.match(error.message, /recipient number may be wrong/);
  assert.equal(error.debug.endpoint, 'https://graph.facebook.com/v24.0/12345/messages');
  assert.equal(error.debug.httpStatus, 400);
  assert.equal(error.debug.messageType, 'text');
  assert.equal(error.debug.toNumber, '********4567');
  assert.equal(error.debug.phoneNumberId, '*2345');
  assert.deepEqual(error.debug.metaResponse, {
    error: {
      code: 131026,
      message: 'Message undeliverable'
    }
  });
  assert.doesNotMatch(JSON.stringify(error.debug), /super-secret-token/);
  assert.match(error.debug.diagnosticNote, /approved WhatsApp template/);
});

test('notifySaleLogged redacts access tokens from Meta error messages', async () => {
  let error;
  try {
    await notifySaleLogged({
      sale: { date: '2026-06-04', quantitySold: 1, salePrice: 37000 },
      product: { productCode: '26sap148' },
      stockLeft: 1,
      whatsappConfig: {
        enabled: true,
        accessToken: 'super-secret-token',
        phoneNumberId: '12345',
        toNumber: '639171234567',
        graphVersion: 'v24.0'
      },
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 999999,
            message: 'Unexpected failure for super-secret-token'
          }
        })
      })
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.doesNotMatch(error.message, /super-secret-token/);
  assert.doesNotMatch(JSON.stringify(error.debug), /super-secret-token/);
  assert.match(error.message, /\[redacted\]/);
});
