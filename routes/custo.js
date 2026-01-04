/**
 * ROTAS: Simulador de Custo
 */

const express = require('express');
const router = express.Router();
const CustoController = require('../controllers/custoController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, CustoController.index);
router.post('/calcular', requireActiveSubscription, CustoController.calcular);

module.exports = router;


