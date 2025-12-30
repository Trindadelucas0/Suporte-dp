/**
 * ROTAS: Perfil do Usuário
 */

const express = require('express');
const router = express.Router();
const PerfilController = require('../controllers/perfilController');
const { requireAuth } = require('../middleware/auth');
const { body } = require('express-validator');

// Validações
const updateValidation = [
  body('nome').trim().isLength({ min: 3 }),
  body('email').isEmail().normalizeEmail()
];

// Todas as rotas requerem autenticação
router.get('/', requireAuth, PerfilController.index);
router.post('/update', requireAuth, updateValidation, PerfilController.update);
router.post('/update-password', requireAuth, PerfilController.updatePassword);
router.post('/sugestao-bug', requireAuth, PerfilController.criarSugestaoBug);

module.exports = router;

