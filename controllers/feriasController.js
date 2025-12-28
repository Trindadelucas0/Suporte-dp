/**
 * CONTROLLER: FeriasController
 * Gerencia cálculos de férias proporcionais
 */

const FeriasService = require('../services/feriasService');
const db = require('../config/database');

class FeriasController {
  static async index(req, res) {
    res.render('ferias/index', {
      title: 'Calculadora de Férias - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    // CORREÇÃO: Férias não calcula valores, apenas avos (igual ao 13º)
    // REMOVIDO: campo diasATirar não deve existir
    const { dataAdmissao, dataReferencia, afastamentosINSS, feriasJaTiradas } = req.body;

    try {
      if (!dataAdmissao || !dataReferencia) {
        return res.render('ferias/index', {
          title: 'Calculadora de Férias - Suporte DP',
          resultado: null,
          error: 'Preencha todos os campos obrigatórios'
        });
      }

      const feriasTiradas = parseInt(feriasJaTiradas) || 0;

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

      // CORREÇÃO: Remove salário e médias - férias calcula apenas avos
      // REMOVIDO: diasATirar não é mais usado
      const resultado = FeriasService.calcular(
        dataAdmissao,
        dataReferencia,
        afastamentos,
        0, // faltas não é usado no cálculo de avos
        feriasTiradas
      );

      // Carrega lei completa
      const fs = require('fs');
      const path = require('path');
      try {
        const leisPath = path.join(__dirname, '..', 'data', 'leis-completas.json');
        const leis = JSON.parse(fs.readFileSync(leisPath, 'utf8'));
        if (leis.ferias) {
          resultado.baseLegal.textoCompleto = leis.ferias.textoCompleto;
        }
      } catch (e) {
        console.warn('Erro ao carregar lei completa:', e.message);
      }

      // Salva no histórico (usando tabela de avos)
      // CORREÇÃO: resultado.totalAvos é o campo correto, não diasFerias ou valorTotal
      await db.query(
        `INSERT INTO calculos_avos (user_id, data_admissao, data_referencia, tipo, avos, valor, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          dataAdmissao,
          dataReferencia,
          'ferias',
          resultado.totalAvos || 0, // Campo correto: totalAvos
          0, // Férias não calcula valores, apenas avos
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('ferias/index', {
        title: 'Calculadora de Férias - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular férias:', error);
      res.render('ferias/index', {
        title: 'Calculadora de Férias - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular férias. Tente novamente.'
      });
    }
  }
}

module.exports = FeriasController;

