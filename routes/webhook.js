/**
 * ROTAS: Webhook
 * Endpoints para receber webhooks de pagamento
 */

const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

// Webhook do InfinitePay (público, sem autenticação)
router.post('/infinitepay', express.json(), WebhookController.infinitepay);

// Endpoint de teste (apenas em desenvolvimento)
router.post('/test', express.json(), WebhookController.test);

module.exports = router;

