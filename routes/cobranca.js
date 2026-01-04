/**
 * ROTAS: Cobrança
 * Endpoints relacionados a cobranças
 */

const express = require('express');
const router = express.Router();
const CobrancaController = require('../controllers/cobrancaController');
const { requireAuth } = require('../middleware/auth');

// NOTA: A rota /assinar-direto foi movida para server.js como rota pública (antes do CSRF)
// Isso permite que usuários não autenticados possam assinar sem precisar de token CSRF

// Todas as rotas requerem autenticação
router.use(requireAuth);

// Página de bloqueio
router.get('/blocked', CobrancaController.blocked);

// Ativar conta via link
router.get('/ativar/:token', CobrancaController.ativar);

// Página de pagamento
router.get('/pagar/:id', CobrancaController.pagar);

// Página de assinatura
router.get('/assinar', CobrancaController.assinar);

// Redireciona para InfinitePay
router.get('/assinar/redirect', CobrancaController.redirecionarAssinatura);

// API: Listar cobranças
router.get('/api/listar', CobrancaController.listar);

// API: Gerar cobrança (admin)
router.post('/api/gerar', CobrancaController.gerarCobranca);

module.exports = router;

