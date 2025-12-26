/**
 * ROTAS: Calculadora de INSS
 */

const express = require('express');
const router = express.Router();
const INSSController = require('../controllers/inssController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, INSSController.index);
router.post('/calcular', requireAuth, INSSController.calcular);

module.exports = router;

