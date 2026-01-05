/**
 * ROTAS: Adquirir
 * Processo de aquisição do sistema
 */

const express = require('express');
const router = express.Router();
const AdquirirController = require('../controllers/adquirirController');

// GET e POST na mesma rota
router.get('/', AdquirirController.index);
router.post('/', AdquirirController.index);

module.exports = router;



