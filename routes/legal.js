/**
 * ROTAS: Páginas Legais
 * Termos de Uso e Política de Privacidade
 */

const express = require('express');
const router = express.Router();

// Termos de Uso
router.get('/termos', (req, res) => {
  res.render('legal/termos', {
    title: 'Termos de Uso - Suporte DP'
  });
});

// Política de Privacidade
router.get('/privacidade', (req, res) => {
  res.render('legal/privacidade', {
    title: 'Política de Privacidade - Suporte DP'
  });
});

module.exports = router;

