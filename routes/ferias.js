/**
 * ROTAS: Férias
 */

const express = require('express');
const router = express.Router();
const FeriasController = require('../controllers/feriasController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, FeriasController.index);
router.post('/calcular', requireActiveSubscription, FeriasController.calcular);

module.exports = router;




