/**
 * CONTROLLER: FGTSController
 * Gerencia cálculos de FGTS
 */

const FGTSService = require('../services/fgtsService');
const db = require('../config/database');

class FGTSController {
  static async index(req, res) {
    res.render('fgts/index', {
      title: 'Calculadora de FGTS - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { salarioBruto, tipoRegistro } = req.body;

    try {
      const salario = parseFloat(salarioBruto);
      const tipo = tipoRegistro || 'clt_geral';

      if (isNaN(salario) || salario <= 0) {
        return res.render('fgts/index', {
          title: 'Calculadora de FGTS - Suporte DP',
          resultado: null,
          error: 'Salário bruto inválido'
        });
      }

      const resultado = FGTSService.calcular(salario, tipo);

      // Carrega lei completa
      const fs = require('fs');
      const path = require('path');
      try {
        const leisPath = path.join(__dirname, '..', 'data', 'leis-completas.json');
        const leis = JSON.parse(fs.readFileSync(leisPath, 'utf8'));
        if (leis.fgts) {
          resultado.baseLegal.textoCompleto = leis.fgts.textoCompleto;
        }
      } catch (e) {
        console.warn('Erro ao carregar lei completa:', e.message);
      }

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_fgts (user_id, salario_bruto, tipo_registro, percentual_fgts, valor_fgts, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          salario,
          tipo,
          resultado.percentualFGTS,
          resultado.valorTotal,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('fgts/index', {
        title: 'Calculadora de FGTS - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular FGTS:', error);
      res.render('fgts/index', {
        title: 'Calculadora de FGTS - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular FGTS. Tente novamente.'
      });
    }
  }
}

module.exports = FGTSController;

