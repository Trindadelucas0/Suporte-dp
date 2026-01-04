/**
 * ROTAS: Período de Risco e Multa
 */

const express = require('express');
const router = express.Router();
const RiscoMultaController = require('../controllers/riscoMultaController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, RiscoMultaController.index);
router.post('/calcular', requireActiveSubscription, RiscoMultaController.calcular);
router.delete('/:id', requireActiveSubscription, RiscoMultaController.deletar);

module.exports = router;

