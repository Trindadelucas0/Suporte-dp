/**
 * CONTROLLER: CustoController
 * Gerencia cálculos de custo total
 */

const CustoService = require('../services/custoService');
const db = require('../config/database');

class CustoController {
  static async index(req, res) {
    res.render('custo/index', {
      title: 'Simulador de Custo do Funcionário - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { salarioBruto, tipoRegistro, beneficios, encargosAdicionais, proLabore, regimeTributario } = req.body;

    try {
      const salario = parseFloat(salarioBruto);
      const beneficiosVal = parseFloat(beneficios) || 0;
      const encargosVal = parseFloat(encargosAdicionais) || 0;
      const tipo = tipoRegistro || 'clt_geral';
      const regime = regimeTributario || 'simples_nacional';

      if (isNaN(salario) || salario <= 0) {
        return res.render('custo/index', {
          title: 'Simulador de Custo do Funcionário - Suporte DP',
          resultado: null,
          error: 'Salário bruto inválido'
        });
      }

      const resultado = CustoService.calcular({
        salarioBruto: salario,
        tipoRegistro: tipo,
        beneficios: beneficiosVal,
        encargosAdicionais: encargosVal,
        proLabore: proLabore === 'true',
        regimeTributario: regime
      });

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_custo (user_id, salario_bruto, valor_ferias, valor_decimo_terceiro, valor_fgts, valor_encargos, valor_beneficios, custo_mensal, custo_anual, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          resultado.salarioBruto,
          resultado.valorFeriasMensal,
          resultado.valorDecimoTerceiroMensal,
          resultado.valorFGTS,
          resultado.encargosAdicionais,
          resultado.beneficios,
          resultado.custoMensal,
          resultado.custoAnual,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('custo/index', {
        title: 'Simulador de Custo do Funcionário - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular custo:', error);
      res.render('custo/index', {
        title: 'Simulador de Custo do Funcionário - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular custo. Tente novamente.'
      });
    }
  }
}

module.exports = CustoController;

