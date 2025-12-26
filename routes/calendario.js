/**
 * ROTAS: Calendário de Obrigações
 */

const express = require('express');
const router = express.Router();
const CalendarioController = require('../controllers/calendarioController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, CalendarioController.index);
router.get('/calcular', requireAuth, CalendarioController.calcular);
router.post('/anotacao', requireAuth, CalendarioController.salvarAnotacao);
router.get('/anotacao/:data', requireAuth, CalendarioController.getAnotacao);

module.exports = router;

