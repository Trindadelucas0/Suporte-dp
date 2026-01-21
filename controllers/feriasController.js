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
    const {
      periodoAquisitivoInicio,
      periodoAquisitivoFim,
      dataConcessaoInicio,
      dataConcessaoFim,
      salario,
      venderUmTerco,
      dependentes,
      pensaoAlimenticia,
      faltouInjustificada,
      diasFaltas,
      afastamentoAuxilioDoenca,
      afastamentoInicio,
      afastamentoFim
    } = req.body;

    try {
      // Validação dos campos obrigatórios
      if (!periodoAquisitivoInicio || !dataConcessaoInicio || !dataConcessaoFim || !salario) {
        return res.render('ferias/index', {
          title: 'Calculadora de Férias - Suporte DP',
          resultado: null,
          error: 'Preencha todos os campos obrigatórios'
        });
      }

      // Calcula período aquisitivo fim se não fornecido
      const moment = require('moment');
      let periodoAquisitivoFimCalculado = periodoAquisitivoFim;
      if (!periodoAquisitivoFimCalculado && periodoAquisitivoInicio) {
        const inicio = moment(periodoAquisitivoInicio);
        const fim = inicio.clone().add(12, 'months').subtract(1, 'day');
        periodoAquisitivoFimCalculado = fim.format('YYYY-MM-DD');
      }

      // Prepara dados para cálculo
      const dadosCalculo = {
        periodoAquisitivoInicio,
        periodoAquisitivoFim: periodoAquisitivoFimCalculado,
        dataConcessaoInicio,
        dataConcessaoFim,
        salario: parseFloat(salario) || 0,
        venderUmTerco: venderUmTerco === 'true' || venderUmTerco === true,
        dependentes: parseInt(dependentes) || 0,
        pensaoAlimenticia: parseFloat(pensaoAlimenticia) || 0,
        faltouInjustificada: faltouInjustificada === 'sim',
        diasFaltas: parseInt(diasFaltas) || 0,
        afastamentoAuxilioDoenca: afastamentoAuxilioDoenca === 'sim',
        afastamentoInicio: afastamentoAuxilioDoenca === 'sim' ? afastamentoInicio : null,
        afastamentoFim: afastamentoAuxilioDoenca === 'sim' ? afastamentoFim : null,
        ano: new Date().getFullYear()
      };

      // Calcula valores monetários de férias
      const resultado = FeriasService.calcularValores(dadosCalculo);

      // Formata datas para exibição
      resultado.periodoAquisitivoFormatado = {
        inicio: moment(resultado.periodoAquisitivo.inicio).format("DD/MM/YYYY"),
        fim: moment(resultado.periodoAquisitivo.fim).format("DD/MM/YYYY")
      };
      resultado.dataConcessaoFormatada = moment(resultado.dataConcessao).format("DD/MM/YYYY");

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

      // Salva no histórico
      await db.query(
        `INSERT INTO calculos_avos (user_id, data_admissao, data_referencia, tipo, avos, valor, memoria_calculo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          periodoAquisitivoInicio,
          dataConcessaoInicio,
          'ferias',
          0, // Não calcula avos neste módulo
          resultado.total,
          JSON.stringify(resultado.memoria)
        ]
      );

      res.render('ferias/index', {
        title: 'Calculadora de Férias - Suporte DP',
        resultado,
        error: null,
        user: req.session.user
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

