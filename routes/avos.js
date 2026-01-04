/**
 * ROTAS: Calculadora de Avos
 */

const express = require('express');
const router = express.Router();
const AvosController = require('../controllers/avosController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, AvosController.index);
router.post('/calcular', requireActiveSubscription, AvosController.calcular);

module.exports = router;


