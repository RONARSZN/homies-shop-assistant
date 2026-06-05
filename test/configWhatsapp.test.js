import assert from 'node:assert/strict';
import test from 'node:test';

test('config reads WhatsApp environment variables', async () => {
  const previous = {
    WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_TO_NUMBER: process.env.WHATSAPP_TO_NUMBER,
    WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION
  };

  process.env.WHATSAPP_ENABLED = 'true';
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '12345';
  process.env.WHATSAPP_TO_NUMBER = '639171234567';
  process.env.WHATSAPP_GRAPH_VERSION = 'v24.0';

  try {
    const { config } = await import(`../server/config.js?whatsapp-test=${Date.now()}`);

    assert.deepEqual(config.whatsapp, {
      enabled: true,
      accessToken: 'test-token',
      phoneNumberId: '12345',
      toNumber: '639171234567',
      graphVersion: 'v24.0'
    });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
