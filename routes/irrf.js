/**
 * ROTAS: Calculadora de IRRF
 */

const express = require('express');
const router = express.Router();
const IRRFController = require('../controllers/irrfController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, IRRFController.index);
router.post('/calcular', requireAuth, IRRFController.calcular);

module.exports = router;

