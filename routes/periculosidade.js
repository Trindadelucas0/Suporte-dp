/**
 * ROTAS: Calculadora de Periculosidade/Insalubridade
 */

const express = require('express');
const router = express.Router();
const PericulosidadeController = require('../controllers/periculosidadeController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, PericulosidadeController.index);
router.post('/calcular', requireActiveSubscription, PericulosidadeController.calcular);

module.exports = router;




