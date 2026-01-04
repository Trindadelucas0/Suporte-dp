/**
 * ROTAS: Calendário de Obrigações
 */

const express = require('express');
const router = express.Router();
const CalendarioController = require('../controllers/calendarioController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, CalendarioController.index);
router.get('/calcular', requireActiveSubscription, CalendarioController.calcular);
router.post('/anotacao', requireActiveSubscription, CalendarioController.salvarAnotacao);
router.get('/anotacao/:data', requireActiveSubscription, CalendarioController.getAnotacao);
router.get('/obrigacoes', requireActiveSubscription, CalendarioController.getObrigacoes);
router.post('/obrigacao', requireActiveSubscription, CalendarioController.salvarObrigacao);
router.delete('/obrigacao/:id', requireActiveSubscription, CalendarioController.removerObrigacao);

module.exports = router;

