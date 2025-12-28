/**
 * ROTAS: Período de Risco e Multa
 */

const express = require('express');
const router = express.Router();
const RiscoMultaController = require('../controllers/riscoMultaController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, RiscoMultaController.index);
router.post('/calcular', requireAuth, RiscoMultaController.calcular);

module.exports = router;

