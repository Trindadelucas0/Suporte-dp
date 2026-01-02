/**
 * ROTAS: Webhook
 * Endpoints para receber webhooks das plataformas de venda
 * 
 * ⚠️ IMPORTANTE: Estas rotas NÃO criam usuários.
 * Apenas processam vendas e geram links de ativação.
 */

const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');

// Middleware para capturar body raw (necessário para validação de assinatura)
// Express já faz parse do JSON, mas precisamos do raw para validação
// Em produção, considere usar body-parser com verify para capturar raw body

/**
 * POST /webhook/kiwify
 * Recebe webhook da plataforma Kiwify
 */
router.post('/kiwify', WebhookController.handleKiwify);

/**
 * POST /webhook/hotmart
 * Recebe webhook da plataforma Hotmart
 */
router.post('/hotmart', WebhookController.handleHotmart);

/**
 * POST /webhook/kirvano
 * Recebe webhook da plataforma Kirvano
 */
router.post('/kirvano', WebhookController.handleKirvano);

module.exports = router;

