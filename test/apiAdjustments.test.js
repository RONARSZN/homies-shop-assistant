import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import { config } from '../server/config.js';
import { apiRouter } from '../server/routes/api.js';

test('adjustments require the configured editor password', async () => {
  const previousPassword = config.itemEditorPassword;
  config.itemEditorPassword = 'shop-secret';

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skuId: 'vest__m',
        quantityAfter: 4,
        reason: 'Correction',
        staffName: 'Mark',
        password: 'wrong'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Incorrect editor password.');
  } finally {
    config.itemEditorPassword = previousPassword;
    await new Promise((resolve) => server.close(resolve));
  }
});
