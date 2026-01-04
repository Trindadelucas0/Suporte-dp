/**
 * ROTAS: Webhook
 * Processa webhooks de integrações externas
 */

const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

// Webhook InfinitePay (não precisa de CSRF, é chamado externamente)
router.post('/infinitepay', WebhookController.infinitepay);

module.exports = router;
