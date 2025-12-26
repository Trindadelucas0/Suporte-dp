/**
 * ROTAS: Autenticação
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { body } = require('express-validator');

// Validações
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('senha').notEmpty()
];

const registerValidation = [
  body('nome').trim().isLength({ min: 3 }),
  body('email').isEmail().normalizeEmail(),
  body('senha').isLength({ min: 6 })
];

router.get('/login', AuthController.login);
router.post('/login', loginValidation, AuthController.login);

router.get('/register', AuthController.register);
router.post('/register', registerValidation, AuthController.register);

router.get('/logout', AuthController.logout);

module.exports = router;

