/**
 * ROTAS: Painel Administrativo
 */

const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, AdminController.index);

module.exports = router;

