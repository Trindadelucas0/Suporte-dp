/**
 * CONTROLLER: INSSController
 * Gerencia cálculos de INSS
 */

const INSSService = require('../services/inssService');
const db = require('../config/database');

class INSSController {
  static async index(req, res) {
    res.render('inss/index', {
      title: 'Calculadora de INSS - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const { salarioBruto, proLabore, ano } = req.body;

    try {
      const salario = parseFloat(salarioBruto);
      const isProLabore = proLabore === 'true' || proLabore === true;
      const anoSelecionado = ano ? parseInt(ano) : null;

      if (isNaN(salario) || salario <= 0) {
        return res.render('inss/index', {
          title: 'Calculadora de INSS - Suporte DP',
          resultado: null,
          error: 'Salário bruto inválido'
        });
      }

      const resultado = INSSService.calcular(salario, isProLabore, anoSelecionado);

      // Carrega lei completa e tabela completa
      const fs = require('fs');
      const path = require('path');
      try {
        const leisPath = path.join(__dirname, '..', 'data', 'leis-completas.json');
        const leis = JSON.parse(fs.readFileSync(leisPath, 'utf8'));
        if (leis.inss) {
          resultado.baseLegal.textoCompleto = leis.inss.textoCompleto;
        }

        // Carrega tabela completa do ano
        const tabelasPath = path.join(__dirname, '..', 'data', 'tabelas-inss-historico.json');
        const tabelas = JSON.parse(fs.readFileSync(tabelasPath, 'utf8'));
        const anoUsado = anoSelecionado || new Date().getFullYear();
        if (tabelas[anoUsado]) {
          resultado.tabelaFaixas = tabelas[anoUsado].faixas;
          if (tabelas[anoUsado].minimoRecolhimento) {
            resultado.minimoRecolhimento = tabelas[anoUsado].minimoRecolhimento;
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar leis/tabelas:', e.message);
      }

      // Salva no histórico
      await db.query(
        'INSERT INTO calculos_inss (user_id, salario_bruto, pro_labore, valor_inss, memoria_calculo) VALUES ($1, $2, $3, $4, $5)',
        [userId, salario, isProLabore, resultado.valorINSS, JSON.stringify(resultado.memoria)]
      );

      res.render('inss/index', {
        title: 'Calculadora de INSS - Suporte DP',
        resultado,
        error: null,
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro ao calcular INSS:', error);
      res.render('inss/index', {
        title: 'Calculadora de INSS - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular INSS. Tente novamente.'
      });
    }
  }
}

module.exports = INSSController;

