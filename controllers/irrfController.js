/**
 * CONTROLLER: IRRFController
 * Gerencia cálculos de IRRF
 */

const IRRFService = require('../services/irrfService');
const INSSService = require('../services/inssService');
const db = require('../config/database');

class IRRFController {
  static async index(req, res) {
    res.render('irrf/index', {
      title: 'Calculadora de IRRF - Suporte DP',
      resultado: null,
      error: null,
      calculoINSS: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { salarioBruto, dependentes, pensaoAlimenticia, ano } = req.body;

    try {
      const salario = parseFloat(salarioBruto);
      const numDependentes = parseInt(dependentes) || 0;
      const pensao = parseFloat(pensaoAlimenticia) || 0;
      const anoSelecionado = ano ? parseInt(ano) : null;

      if (isNaN(salario) || salario <= 0) {
        return res.render('irrf/index', {
          title: 'Calculadora de IRRF - Suporte DP',
          resultado: null,
          error: 'Salário bruto inválido'
        });
      }

      // Calcula INSS primeiro (usa o mesmo ano)
      const calculoINSS = INSSService.calcular(salario, false, anoSelecionado);
      
      // Calcula IRRF
      const resultado = IRRFService.calcular(
        salario,
        calculoINSS.valorINSS,
        numDependentes,
        pensao,
        anoSelecionado
      );

      // Carrega lei completa
      const fs = require('fs');
      const path = require('path');
      try {
        const leisPath = path.join(__dirname, '..', 'data', 'leis-completas.json');
        const leis = JSON.parse(fs.readFileSync(leisPath, 'utf8'));
        if (leis.irrf) {
          resultado.baseLegal.textoCompleto = leis.irrf.textoCompleto;
        }
      } catch (e) {
        console.warn('Erro ao carregar lei completa:', e.message);
      }

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_irrf (user_id, salario_bruto, valor_inss, dependentes, pensao_alimenticia, base_calculo, aliquota, valor_irrf, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          salario,
          calculoINSS.valorINSS,
          numDependentes,
          pensao,
          resultado.baseCalculo,
          resultado.aliquota,
          resultado.valorIRRF,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('irrf/index', {
        title: 'Calculadora de IRRF - Suporte DP',
        resultado,
        calculoINSS,
        error: null,
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro ao calcular IRRF:', error);
      res.render('irrf/index', {
        title: 'Calculadora de IRRF - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular IRRF. Tente novamente.'
      });
    }
  }
}

module.exports = IRRFController;

