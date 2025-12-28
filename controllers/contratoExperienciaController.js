/**
 * CONTROLLER: ContratoExperienciaController
 * Gerencia cálculos de quebra de contrato de experiência
 */

const ContratoExperienciaService = require('../services/contratoExperienciaService');
const db = require('../config/database');

class ContratoExperienciaController {
  static async index(req, res) {
    res.render('contrato-experiencia/index', {
      title: 'Quebra de Contrato de Experiência - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { dataInicio, dataFimPrevisto, dataEncerramento, salarioBase, valorMedias } = req.body;

    try {
      if (!dataInicio || !dataFimPrevisto || !dataEncerramento || !salarioBase) {
        return res.render('contrato-experiencia/index', {
          title: 'Quebra de Contrato de Experiência - Suporte DP',
          resultado: null,
          error: 'Preencha todos os campos obrigatórios'
        });
      }

      const salario = parseFloat(salarioBase);
      const medias = parseFloat(valorMedias) || 0;

      if (isNaN(salario) || salario <= 0) {
        return res.render('contrato-experiencia/index', {
          title: 'Quebra de Contrato de Experiência - Suporte DP',
          resultado: null,
          error: 'Salário base inválido'
        });
      }

      const resultado = ContratoExperienciaService.calcular(
        dataInicio,
        dataFimPrevisto,
        dataEncerramento,
        salario,
        medias
      );

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_contrato_experiencia (user_id, data_inicio, data_fim_previsto, data_encerramento, salario_base, valor_medias, quebrado_pelo_empregador, valor_total, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          dataInicio,
          dataFimPrevisto,
          dataEncerramento,
          salario,
          medias,
          resultado.quebradoPeloEmpregador,
          resultado.valorTotal,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('contrato-experiencia/index', {
        title: 'Quebra de Contrato de Experiência - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular quebra de contrato:', error);
      res.render('contrato-experiencia/index', {
        title: 'Quebra de Contrato de Experiência - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular. Tente novamente.'
      });
    }
  }
}

module.exports = ContratoExperienciaController;

