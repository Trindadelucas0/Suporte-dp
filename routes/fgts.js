/**
 * ROTAS: Calculadora de FGTS
 */

const express = require('express');
const router = express.Router();
const FGTSController = require('../controllers/fgtsController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, FGTSController.index);
router.post('/calcular', requireActiveSubscription, FGTSController.calcular);

module.exports = router;


