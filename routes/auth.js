/**
 * ROTAS: Autenticação
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Função para obter IP real (considera proxy do Render)
const getRealIp = (req) => {
  // Render usa X-Forwarded-For
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip;
};

// Rate Limiting para Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealIp(req), // Usa IP real considerando proxy do Render
});

// Rate Limiting para Registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora
  message: "Muitas tentativas de registro. Tente novamente em 1 hora.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealIp(req), // Usa IP real considerando proxy do Render
});

// Validações
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha é obrigatória')
];

const registerValidation = [
  body('nome').trim().isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('confirmarSenha').custom((value, { req }) => {
    if (value !== req.body.senha) {
      throw new Error('As senhas não coincidem');
    }
    return true;
  })
];

router.get('/login', AuthController.login);
router.post('/login', loginLimiter, loginValidation, AuthController.login);

router.get('/register', AuthController.register);
router.post('/register', registerLimiter, registerValidation, AuthController.register);

router.get('/logout', AuthController.logout);

module.exports = router;

