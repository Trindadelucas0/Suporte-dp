/**
 * ROTAS: Perfil do Usuário
 */

const express = require('express');
const router = express.Router();
const PerfilController = require('../controllers/perfilController');
const { requireActiveSubscription } = require('../middleware/auth');
const { body } = require('express-validator');

// Validações
const updateBasicValidation = [
  body('nome').trim().isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres'),
  body('email').trim().isEmail().withMessage('Email inválido')
];

const updatePasswordValidation = [
  body('senhaAtual').notEmpty().withMessage('Senha atual é obrigatória'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres'),
  body('confirmarNovaSenha').custom((value, { req }) => {
    if (value !== req.body.novaSenha) {
      throw new Error('As senhas não coincidem');
    }
    return true;
  })
];

// Todas as rotas requerem autenticação
router.get('/', requireActiveSubscription, PerfilController.index);
router.post('/update-basic', requireActiveSubscription, updateBasicValidation, PerfilController.updateBasic);
router.post('/update-profile', requireActiveSubscription, PerfilController.updateProfile);
router.post('/update-password', requireActiveSubscription, updatePasswordValidation, PerfilController.updatePassword);

module.exports = router;

