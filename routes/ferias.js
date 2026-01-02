/**
 * ROTAS: Férias
 */

const express = require('express');
const router = express.Router();
const FeriasController = require('../controllers/feriasController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, FeriasController.index);
router.post('/calcular', requireAuth, FeriasController.calcular);

module.exports = router;


