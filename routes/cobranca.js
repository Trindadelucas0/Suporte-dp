/**
 * ROTAS: Cobrança
 * Endpoints relacionados a cobranças
 */

const express = require('express');
const router = express.Router();
const CobrancaController = require('../controllers/cobrancaController');
const { requireAuth } = require('../middleware/auth');

// Rota pública para assinatura direta (sem login)
router.post('/assinar-direto', CobrancaController.assinarDireto);

// Todas as outras rotas requerem autenticação
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

