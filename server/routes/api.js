import express from 'express';
import { hasGoogleConfig } from '../config.js';
import { config } from '../config.js';
import { updateProductPrice, validateEditorPassword } from '../services/productEditor.js';
import { saveStockCount } from '../services/stockCountService.js';
import { toUserFacingError } from '../services/userFacingErrors.js';
import {
  adjustInventory,
  cancelPendingSaleItem,
  cancelPendingSaleTransaction,
  generateReports,
  getAnalytics,
  getFrontDeskQueue,
  getProducts,
  getSales,
  getSetupStatus,
  logSale,
  setupSheets,
  unlockFrontDesk,
  verifyPendingSaleItem,
  verifyPendingSaleTransaction
} from '../services/shopService.js';

export const apiRouter = express.Router();

apiRouter.get('/health', async (req, res) => {
  res.json({ ok: true, googleConfigured: hasGoogleConfig() });
});

apiRouter.get('/setup', handle(async (req, res) => {
  res.json(await getSetupStatus());
}));

apiRouter.post('/setup', handle(async (req, res) => {
  res.json(await setupSheets());
}));

apiRouter.get('/products', handle(async (req, res) => {
  res.json({ products: await getProducts() });
}));

apiRouter.get('/sales', handle(async (req, res) => {
  res.json({ sales: await getSales() });
}));

apiRouter.post('/sales', handle(async (req, res) => {
  res.json(await logSale(req.body));
}));

apiRouter.post('/front-desk/unlock', handle(async (req, res) => {
  res.json(unlockFrontDesk(req.body));
}));

apiRouter.get('/front-desk/pending', handle(async (req, res) => {
  unlockFrontDesk({ password: req.get('x-front-desk-password') || '' });
  res.json(await getFrontDeskQueue(undefined, {
    includeHistory: req.query.history === 'true'
  }));
}));

apiRouter.post('/front-desk/items/:rowNumber/verify', handle(async (req, res) => {
  res.json(await verifyPendingSaleItem({
    ...req.body,
    rowNumber: req.params.rowNumber
  }));
}));

apiRouter.post('/front-desk/transactions/:pendingId/verify', handle(async (req, res) => {
  res.json(await verifyPendingSaleTransaction({
    ...req.body,
    pendingId: req.params.pendingId
  }));
}));

apiRouter.post('/front-desk/items/:rowNumber/cancel', handle(async (req, res) => {
  res.json(await cancelPendingSaleItem({
    ...req.body,
    rowNumber: req.params.rowNumber
  }));
}));

apiRouter.post('/front-desk/transactions/:pendingId/cancel', handle(async (req, res) => {
  res.json(await cancelPendingSaleTransaction({
    ...req.body,
    pendingId: req.params.pendingId
  }));
}));

apiRouter.post('/editor/unlock', handle(async (req, res) => {
  if (!validateEditorPassword(req.body.password, config.itemEditorPassword)) {
    throw new Error('Incorrect editor password.');
  }

  res.json({ ok: true });
}));

apiRouter.patch('/products/:skuId', handle(async (req, res) => {
  if (!validateEditorPassword(req.body.password, config.itemEditorPassword)) {
    throw new Error('Incorrect editor password.');
  }

  res.json(await updateProductPrice({
    skuId: req.params.skuId,
    srp: req.body.srp
  }));
}));

apiRouter.post('/adjustments', handle(async (req, res) => {
  if (!validateEditorPassword(req.body.password, config.itemEditorPassword)) {
    throw new Error('Incorrect editor password.');
  }

  res.json(await adjustInventory(req.body));
}));

apiRouter.post('/stock-counts', handle(async (req, res) => {
  res.json(await saveStockCount(req.body));
}));

apiRouter.get('/analytics', handle(async (req, res) => {
  res.json(await getAnalytics());
}));

apiRouter.post('/reports', handle(async (req, res) => {
  res.json(await generateReports());
}));

function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      res.status(400).json({
        error: toUserFacingError(error)
      });
    }
  };
}
