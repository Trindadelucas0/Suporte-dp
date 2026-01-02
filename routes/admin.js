/**
 * ROTAS: Painel Administrativo
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Middleware para todas as rotas admin
router.use(requireAuth, requireAdmin);

// Dashboard
router.get('/', AdminController.index);

// Gestão de usuários
router.get('/usuarios', AdminController.usuarios);
router.get('/usuarios/:id', AdminController.usuarioDetalhes);
router.post('/usuarios/:id/atualizar', AdminController.atualizarUsuario);
router.post('/usuarios/:id/resetar-senha', AdminController.resetarSenha);

// Notificações administrativas
router.get('/notificacoes', AdminController.notificacoes);
router.post('/notificacoes/criar', AdminController.criarNotificacao);

module.exports = router;

