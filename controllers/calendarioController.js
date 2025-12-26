/**
 * CONTROLLER: CalendarioController
 * Gerencia calendário e dias úteis
 */

const CalendarioService = require('../services/calendarioService');

class CalendarioController {
  static async index(req, res) {
    const userId = req.session.user.id;
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    try {
      const calendario = await CalendarioService.getCalendarioMensal(userId, ano, mes);
      
      res.render('calendario/index', {
        title: 'Calendário de Obrigações - Suporte DP',
        calendario,
        ano,
        mes,
        mesNome: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })
      });
    } catch (error) {
      console.error('Erro no calendário:', error);
      res.render('calendario/index', {
        title: 'Calendário de Obrigações - Suporte DP',
        calendario: [],
        ano,
        mes,
        mesNome: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })
      });
    }
  }

  static async calcular(req, res) {
    const { dataInicio, dataFim, tipoSemana } = req.query;

    if (!dataInicio || !dataFim) {
      return res.json({ error: 'Datas são obrigatórias' });
    }

    try {
      const resultado = await CalendarioService.calcularDiasUteis(
        dataInicio,
        dataFim,
        tipoSemana || 'segunda_sexta'
      );
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao calcular dias úteis:', error);
      res.status(500).json({ error: 'Erro ao calcular dias úteis' });
    }
  }

  static async salvarAnotacao(req, res) {
    const userId = req.session.user.id;
    const { data, anotacao } = req.body;

    try {
      const resultado = await CalendarioService.saveAnotacao(userId, data, anotacao);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      res.status(500).json({ error: 'Erro ao salvar anotação' });
    }
  }

  static async getAnotacao(req, res) {
    const userId = req.session.user.id;
    const { data } = req.params;

    try {
      const anotacao = await CalendarioService.getAnotacao(userId, data);
      res.json({ success: true, data: anotacao });
    } catch (error) {
      console.error('Erro ao buscar anotação:', error);
      res.status(500).json({ error: 'Erro ao buscar anotação' });
    }
  }
}

module.exports = CalendarioController;

