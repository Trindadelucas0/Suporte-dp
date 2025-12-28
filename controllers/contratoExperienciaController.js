/**
 * CONTROLLER: ContratoExperienciaController
 * Gerencia cálculos de quebra de contrato de experiência
 */

const ContratoExperienciaService = require('../services/contratoExperienciaService');
const db = require('../config/database');

class ContratoExperienciaController {
  static async index(req, res) {
    res.render('contrato-experiencia/index', {
      title: 'Multa de Quebra de Contrato de Experiência - Suporte DP',
      resultado: null,
      error: null
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    // CORREÇÃO: Removido valorMedias - cálculo é apenas da multa
    // CORREÇÃO: Adicionado campo para identificar quem quebrou o contrato
    const { dataInicio, dataFimPrevisto, dataEncerramento, salarioBase, quemQuebrou } = req.body;

    try {
      if (!dataInicio || !dataFimPrevisto || !dataEncerramento || !salarioBase) {
        return res.render('contrato-experiencia/index', {
          title: 'Multa de Quebra de Contrato de Experiência - Suporte DP',
          resultado: null,
          error: 'Preencha todos os campos obrigatórios'
        });
      }

      const salario = parseFloat(salarioBase);

      if (isNaN(salario) || salario <= 0) {
        return res.render('contrato-experiencia/index', {
          title: 'Multa de Quebra de Contrato de Experiência - Suporte DP',
          resultado: null,
          error: 'Salário base inválido'
        });
      }

      // Calcula APENAS a multa de quebra (Art. 479 ou 480)
      const resultado = ContratoExperienciaService.calcular(
        dataInicio,
        dataFimPrevisto,
        dataEncerramento,
        salario,
        quemQuebrou || 'empregador'
      );

      // CORREÇÃO: Não salva no banco - cálculo é apenas informativo
      // A multa de quebra de contrato de experiência não precisa de histórico persistido
      // Se necessário no futuro, pode-se criar a tabela, mas por ora é apenas cálculo informativo

      // Carrega lei completa do arquivo JSON
      const fs = require('fs');
      const path = require('path');
      try {
        const leisPath = path.join(__dirname, '..', 'data', 'leis-completas.json');
        const leis = JSON.parse(fs.readFileSync(leisPath, 'utf8'));
        
        // Adiciona texto completo conforme o artigo aplicado
        if (resultado.artigoAplicado === 'Art. 479' && leis.contrato_experiencia_479) {
          resultado.baseLegal.textoCompleto = leis.contrato_experiencia_479.textoCompleto;
        } else if (resultado.artigoAplicado === 'Art. 480' && leis.contrato_experiencia_480) {
          resultado.baseLegal.textoCompleto = leis.contrato_experiencia_480.textoCompleto;
        }
      } catch (e) {
        console.warn('Erro ao carregar lei completa:', e.message);
      }

      res.render('contrato-experiencia/index', {
        title: 'Multa de Quebra de Contrato de Experiência - Suporte DP',
        resultado,
        error: null
      });
    } catch (error) {
      console.error('Erro ao calcular multa de quebra:', error);
      res.render('contrato-experiencia/index', {
        title: 'Multa de Quebra de Contrato de Experiência - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular. Tente novamente.'
      });
    }
  }
}

module.exports = ContratoExperienciaController;

