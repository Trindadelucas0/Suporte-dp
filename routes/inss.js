/**
 * ROTAS: Calculadora de INSS
 */

const express = require('express');
const router = express.Router();
const INSSController = require('../controllers/inssController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, INSSController.index);
router.post('/calcular', requireActiveSubscription, INSSController.calcular);

module.exports = router;


