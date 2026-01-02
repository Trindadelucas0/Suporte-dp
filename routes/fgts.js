/**
 * ROTAS: Calculadora de FGTS
 */

const express = require('express');
const router = express.Router();
const FGTSController = require('../controllers/fgtsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, FGTSController.index);
router.post('/calcular', requireAuth, FGTSController.calcular);

module.exports = router;


