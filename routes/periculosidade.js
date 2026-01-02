/**
 * ROTAS: Calculadora de Periculosidade/Insalubridade
 */

const express = require('express');
const router = express.Router();
const PericulosidadeController = require('../controllers/periculosidadeController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, PericulosidadeController.index);
router.post('/calcular', requireAuth, PericulosidadeController.calcular);

module.exports = router;


