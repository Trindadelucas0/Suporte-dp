/**
 * CONTROLLER: AvosController
 * Gerencia cálculos de avos (férias e 13º)
 */

const AvosService = require('../services/avosService');
const db = require('../config/database');

class AvosController {
  static async index(req, res) {
    res.render('avos/index', {
      title: 'Calculadora de Avos - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { dataAdmissao, dataReferencia, afastamentosINSS } = req.body;

    try {
      if (!dataAdmissao || !dataReferencia) {
        return res.render('avos/index', {
          title: 'Calculadora de Avos - 13º Salário - Suporte DP',
          resultado: null,
          error: 'Datas são obrigatórias'
        });
      }

      let afastamentos = [];
      if (afastamentosINSS) {
        try {
          afastamentos = typeof afastamentosINSS === 'string' 
            ? JSON.parse(afastamentosINSS) 
            : afastamentosINSS;
        } catch (e) {
          afastamentos = [];
        }
      }

      // Calcula apenas 13º salário
      const resultado = AvosService.calcularDecimoTerceiro(
        dataAdmissao,
        dataReferencia,
        afastamentos
      );

      // Carrega lei completa
      const fs = require('fs');
      const path = require('path');
      try {
        const leisPath = path.join(__dirname, '..', 'data', 'leis-completas.json');
        const leis = JSON.parse(fs.readFileSync(leisPath, 'utf8'));
        if (leis.decimo_terceiro) {
          resultado.baseLegal.textoCompleto = leis.decimo_terceiro.textoCompleto;
        }
      } catch (e) {
        console.warn('Erro ao carregar lei completa:', e.message);
      }

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_avos (user_id, data_admissao, data_referencia, tipo, avos, valor, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          dataAdmissao,
          dataReferencia,
          'decimo_terceiro',
          resultado.totalAvos,
          null,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('avos/index', {
        title: 'Calculadora de Avos - 13º Salário - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular avos:', error);
      res.render('avos/index', {
        title: 'Calculadora de Avos - 13º Salário - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular avos. Tente novamente.'
      });
    }
  }
}

module.exports = AvosController;

