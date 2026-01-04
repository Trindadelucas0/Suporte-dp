/**
 * ROTAS: Dashboard
 */

const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { requireActiveSubscription } = require('../middleware/auth');

router.get('/', requireActiveSubscription, DashboardController.index);

module.exports = router;


