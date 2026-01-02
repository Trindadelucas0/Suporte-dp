/**
 * ROTAS: Ativação
 * Endpoints para cadastro via link de ativação
 * 
 * ⚠️ IMPORTANTE: Usuário só é criado após preencher formulário
 */

const express = require('express');
const router = express.Router();
const ActivationController = require('../controllers/activationController');

/**
 * GET /ativar/:token
 * Exibe formulário de cadastro com token de ativação
 */
router.get('/:token', ActivationController.showActivationForm);

/**
 * POST /ativar/:token
 * Processa cadastro via link de ativação
 */
router.post('/:token', ActivationController.processActivation);

module.exports = router;

