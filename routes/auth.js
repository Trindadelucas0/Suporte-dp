/**
 * ROTAS: Autenticação
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const ValidarPagamentoController = require('../controllers/validarPagamentoController');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validateAndNormalizeEmail } = require('../utils/emailValidator');

// Função para obter IP real (VPS com ou sem proxy reverso)
const getRealIp = (req) => {
  // Se tiver proxy reverso (Nginx/Apache), IP vem no header
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  // VPS direto (sem proxy reverso)
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip ||
         '127.0.0.1';
};

// Rate Limiting para Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealIp(req), // Usa IP real (VPS com ou sem proxy)
});

// Rate Limiting para Registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora
  message: "Muitas tentativas de registro. Tente novamente em 1 hora.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealIp(req), // Usa IP real (VPS com ou sem proxy)
  handler: (req, res) => {
    // Retorna página de erro em vez de JSON quando rate limit é atingido
    console.warn('⚠️ Rate limit atingido para registro:', {
      ip: getRealIp(req),
      path: req.path
    });
    return res.status(429).render('auth/register', {
      title: 'Cadastro - Suporte DP',
      error: 'Muitas tentativas de registro. Por favor, tente novamente em 1 hora.',
      order_nsu: null,
      payment: null
    });
  }
});

// Validações
const loginValidation = [
  body('email')
    .trim()
    .custom((value) => {
      const result = validateAndNormalizeEmail(value);
      if (!result.valid) {
        throw new Error(result.error || 'Email inválido');
      }
      return true;
    })
    .customSanitizer((value) => {
      // Normaliza o email (minúsculas, preserva pontos)
      const result = validateAndNormalizeEmail(value);
      return result.normalized || value;
    }),
  body('senha').notEmpty().withMessage('Senha é obrigatória')
];

const registerValidation = [
  body('nome').trim().isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres'),
  body('email')
    .trim()
    .custom((value) => {
      const result = validateAndNormalizeEmail(value);
      if (!result.valid) {
        throw new Error(result.error || 'Email inválido');
      }
      return true;
    })
    .customSanitizer((value) => {
      // Normaliza o email (minúsculas, preserva pontos)
      const result = validateAndNormalizeEmail(value);
      return result.normalized || value;
    }),
  body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('confirmarSenha').custom((value, { req }) => {
    if (value !== req.body.senha) {
      throw new Error('As senhas não coincidem');
    }
    return true;
  })
];

// Rota GET /login com tratamento de erro
router.get('/login', async (req, res, next) => {
  try {
    await AuthController.login(req, res);
  } catch (error) {
    console.error('❌ [AUTH] Erro ao acessar rota GET /login:', error);
    console.error('Stack:', error.stack);
    // Renderiza página de erro ao invés de quebrar
    res.status(500).render('auth/login', {
      title: 'Login - Suporte DP',
      error: 'Erro ao carregar página de login. Tente novamente.',
      success: null
    });
  }
});

router.post('/login', loginLimiter, loginValidation, AuthController.login);

router.get('/register', AuthController.register);
router.post('/register', registerLimiter, registerValidation, AuthController.register);

router.get('/logout', AuthController.logout);

router.get('/validar-pagamento', ValidarPagamentoController.index);
router.post('/validar-pagamento', ValidarPagamentoController.validar);

module.exports = router;

