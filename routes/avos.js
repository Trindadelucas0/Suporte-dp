/**
 * ROTAS: Calculadora de Avos
 */

const express = require('express');
const router = express.Router();
const AvosController = require('../controllers/avosController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, AvosController.index);
router.post('/calcular', requireAuth, AvosController.calcular);

module.exports = router;

