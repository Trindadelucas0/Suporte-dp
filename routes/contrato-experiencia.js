/**
 * ROTAS: Quebra de Contrato de Experiência
 */

const express = require('express');
const router = express.Router();
const ContratoExperienciaController = require('../controllers/contratoExperienciaController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ContratoExperienciaController.index);
router.post('/calcular', requireAuth, ContratoExperienciaController.calcular);

module.exports = router;

