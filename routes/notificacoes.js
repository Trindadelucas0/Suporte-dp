/**
 * ROTAS: Notificações
 */

const express = require('express');
const router = express.Router();
const NotificacoesController = require('../controllers/notificacoesController');
const { requireAuth } = require('../middleware/auth');

router.get('/api/nao-lidas', requireAuth, NotificacoesController.getNaoLidas);
router.get('/api/todas', requireAuth, NotificacoesController.getAll);
router.get('/api/count', requireAuth, NotificacoesController.getCount);
router.post('/api/:id/marcar-lida', requireAuth, NotificacoesController.marcarComoLida);
router.post('/api/marcar-todas-lidas', requireAuth, NotificacoesController.marcarTodasComoLidas);

module.exports = router;

