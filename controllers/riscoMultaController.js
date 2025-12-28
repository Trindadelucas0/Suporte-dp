/**
 * CONTROLLER: RiscoMultaController
 * Gerencia cálculos de período de risco e multa
 */

const RiscoMultaService = require('../services/riscoMultaService');
const db = require('../config/database');

class RiscoMultaController {
  static async index(req, res) {
    const userId = req.session.user.id;
    
    // Busca histórico de cálculos
    let historico = [];
    try {
      const result = await db.query(
        `SELECT * FROM calculos_data_base 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId]
      );
      historico = result.rows;
    } catch (error) {
      console.warn('Erro ao buscar histórico:', error.message);
    }

    res.render('risco-multa/index', {
      title: 'Multa da Data Base - Suporte DP',
      resultado: null,
      error: null,
      historico
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { dataBase, dataRescisao, salarioBase, valorMedias } = req.body;

    try {
      if (!dataBase || !dataRescisao || !salarioBase) {
        return res.render('risco-multa/index', {
          title: 'Multa da Data Base - Suporte DP',
          resultado: null,
          error: 'Preencha todos os campos obrigatórios'
        });
      }

      const salario = parseFloat(salarioBase);
      const medias = parseFloat(valorMedias) || 0;

      if (isNaN(salario) || salario <= 0) {
        return res.render('risco-multa/index', {
          title: 'Multa da Data Base - Suporte DP',
          resultado: null,
          error: 'Salário base inválido'
        });
      }

      const resultado = RiscoMultaService.calcular(
        dataBase,
        dataRescisao,
        salario,
        medias
      );

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_data_base (user_id, data_base, data_rescisao, salario_base, valor_medias, base_calculo, esta_no_risco, valor_multa, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          dataBase,
          dataRescisao,
          salario,
          medias,
          resultado.baseCalculo,
          resultado.estaNoRisco,
          resultado.valorMulta,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('risco-multa/index', {
        title: 'Multa da Data Base - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular multa da data base:', error);
      res.render('risco-multa/index', {
        title: 'Multa da Data Base - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular. Tente novamente.'
      });
    }
  }
}

module.exports = RiscoMultaController;

