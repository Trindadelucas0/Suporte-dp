/**
 * ROTAS: Calculadora de IRRF
 */

const express = require('express');
const router = express.Router();
const IRRFController = require('../controllers/irrfController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, IRRFController.index);
router.post('/calcular', requireActiveSubscription, IRRFController.calcular);

module.exports = router;


