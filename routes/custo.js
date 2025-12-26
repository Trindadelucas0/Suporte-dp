/**
 * ROTAS: Simulador de Custo
 */

const express = require('express');
const router = express.Router();
const CustoController = require('../controllers/custoController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, CustoController.index);
router.post('/calcular', requireAuth, CustoController.calcular);

module.exports = router;

