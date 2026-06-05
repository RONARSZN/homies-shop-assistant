import assert from 'node:assert/strict';
import test from 'node:test';
import { notifySaleLinesLoggedSafely } from '../server/services/shopService.js';

test('sale WhatsApp wrapper keeps sale logging non-blocking when WhatsApp fails', async () => {
  const warnings = [];
  const result = await notifySaleLinesLoggedSafely({
    sale: {
      date: '2026-06-04',
      customerName: 'Mark',
      staffName: 'Mark',
      paymentMethod: 'Cash'
    },
    lines: [
      {
        item: { quantitySold: 1, salePrice: 37000 },
        product: { productCode: '26sap148' },
        stockLeft: 1
      }
    ],
    notifySaleLoggedImpl: async () => {
      const error = new Error('WhatsApp did not deliver the message.');
      error.debug = {
        endpoint: 'https://graph.facebook.com/v24.0/12345/messages',
        httpStatus: 400,
        messageType: 'text',
        toNumber: '********4567',
        phoneNumberId: '*2345',
        metaResponse: {
          error: {
            code: 131026,
            message: 'Message undeliverable'
          }
        },
        diagnosticNote:
          'This app sends free-form text. Meta may require an approved WhatsApp template for business-initiated messages.'
      };
      throw error;
    },
    logger: {
      log() {},
      warn(message, details) {
        warnings.push({ message, details });
      }
    }
  });

  assert.equal(result.sent, false);
  assert.equal(result.error, 'WhatsApp did not deliver the message.');
  assert.equal(result.debug.httpStatus, 400);
  assert.equal(result.debug.toNumber, '********4567');
  assert.equal(result.debug.phoneNumberId, '*2345');
  assert.match(result.debug.diagnosticNote, /approved WhatsApp template/);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].details.httpStatus, 400);
  assert.doesNotMatch(JSON.stringify(result), /Bearer|secret-token/);
  assert.doesNotMatch(JSON.stringify(warnings), /Bearer|secret-token/);
});
