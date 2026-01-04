/**
 * ROTAS: Notificações
 */

const express = require('express');
const router = express.Router();
const NotificacoesController = require('../controllers/notificacoesController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/api/nao-lidas', requireActiveSubscription, NotificacoesController.getNaoLidas);
router.get('/api/todas', requireActiveSubscription, NotificacoesController.getAll);
router.get('/api/count', requireActiveSubscription, NotificacoesController.getCount);
router.post('/api/:id/marcar-lida', requireActiveSubscription, NotificacoesController.marcarComoLida);
router.post('/api/marcar-todas-lidas', requireActiveSubscription, NotificacoesController.marcarTodasComoLidas);

module.exports = router;

