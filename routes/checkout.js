/**
 * ROTAS: Checkout
 * Processo de checkout após cadastro
 */

const express = require('express');
const router = express.Router();
const CheckoutController = require('../controllers/checkoutController');
const { requireAuth } = require('../middleware/auth');

// Rota de sucesso (não requer auth, mas verifica se tem sessão)
router.get('/sucesso', CheckoutController.sucesso);

// Requer autenticação
router.get('/', requireAuth, CheckoutController.index);
router.post('/', requireAuth, CheckoutController.index);

module.exports = router;

