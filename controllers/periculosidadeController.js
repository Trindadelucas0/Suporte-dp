/**
 * CONTROLLER: PericulosidadeController
 * Gerencia cálculos de periculosidade e insalubridade
 */

const PericulosidadeService = require('../services/periculosidadeService');
const db = require('../config/database');

class PericulosidadeController {
  static async index(req, res) {
    res.render('periculosidade/index', {
      title: 'Calculadora de Periculosidade/Insalubridade - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { tipo, ano, grauInsalubridade } = req.body;

    try {
      // Valida se o ano foi informado
      const anoSelecionado = ano ? parseInt(ano) : null;
      if (!anoSelecionado || ![2024, 2025, 2026].includes(anoSelecionado)) {
        return res.render('periculosidade/index', {
          title: 'Calculadora de Periculosidade/Insalubridade - Suporte DP',
          resultado: null,
          error: 'Ano é obrigatório. Selecione 2024, 2025 ou 2026.'
        });
      }

      let resultado;

      if (tipo === 'periculosidade') {
        resultado = PericulosidadeService.calcularPericulosidade(anoSelecionado);
      } else if (tipo === 'insalubridade') {
        const grau = grauInsalubridade || 'medio';
        resultado = PericulosidadeService.calcularInsalubridade(grau, anoSelecionado);
      } else {
        return res.render('periculosidade/index', {
          title: 'Calculadora de Periculosidade/Insalubridade - Suporte DP',
          resultado: null,
          error: 'Tipo inválido'
        });
      }

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_periculosidade (user_id, tipo, salario_base, percentual, valor_adicional, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          tipo,
          resultado.salarioMinimo || 0,
          resultado.percentual,
          resultado.valorAdicional,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('periculosidade/index', {
        title: 'Calculadora de Periculosidade/Insalubridade - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular:', error);
      res.render('periculosidade/index', {
        title: 'Calculadora de Periculosidade/Insalubridade - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular. Tente novamente.'
      });
    }
  }
}

module.exports = PericulosidadeController;

