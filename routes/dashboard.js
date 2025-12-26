/**
 * ROTAS: Dashboard
 */

const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, DashboardController.index);

module.exports = router;

