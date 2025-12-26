/**
 * ROTAS: Geração de PDF (sob demanda)
 */

const express = require('express');
const router = express.Router();
const PDFController = require('../controllers/pdfController');
const { requireAuth } = require('../middleware/auth');

// Gera PDF sob demanda (recebe dados no body)
router.post('/:tipo', requireAuth, PDFController.gerar);

module.exports = router;

