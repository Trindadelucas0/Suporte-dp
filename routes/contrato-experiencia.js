/**
 * ROTAS: Quebra de Contrato de Experiência
 */

const express = require('express');
const router = express.Router();
const ContratoExperienciaController = require('../controllers/contratoExperienciaController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, ContratoExperienciaController.index);
router.post('/calcular', requireActiveSubscription, ContratoExperienciaController.calcular);

module.exports = router;


