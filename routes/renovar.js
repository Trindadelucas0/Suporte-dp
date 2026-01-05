/**
 * ROTAS: Renovação de Assinatura
 */

const express = require('express');
const router = express.Router();
const RenovarController = require('../controllers/renovarController');
const { requireAuth } = require('../middleware/auth');

// Requer autenticação (mesmo com assinatura expirada)
router.get('/', requireAuth, RenovarController.index);
router.post('/', requireAuth, RenovarController.index);

module.exports = router;



