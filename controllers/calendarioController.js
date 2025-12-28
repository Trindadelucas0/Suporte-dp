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
      
      // Debug: verifica se calendário tem dados
      console.log(`Calendário ${ano}/${mes}: ${calendario.length} dias`);
      
      res.render('calendario/index', {
        title: 'Calendário de Obrigações - Suporte DP',
        calendario: calendario || [],
        ano,
        mes,
        mesNome: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' }),
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro no calendário:', error);
      res.render('calendario/index', {
        title: 'Calendário de Obrigações - Suporte DP',
        calendario: [],
        ano,
        mes,
        mesNome: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' }),
        user: req.session.user
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

  static async getObrigacoes(req, res) {
    const userId = req.session.user.id;
    const { data } = req.query;

    try {
      const obrigacoes = await CalendarioService.getObrigacoes(userId, data);
      res.json({ success: true, data: obrigacoes });
    } catch (error) {
      console.error('Erro ao buscar obrigações:', error);
      res.status(500).json({ error: 'Erro ao buscar obrigações' });
    }
  }

  static async salvarObrigacao(req, res) {
    const userId = req.session.user.id;
    const { data, tipo, descricao, observacao } = req.body;

    try {
      const resultado = await CalendarioService.saveObrigacao(userId, data, tipo, descricao, observacao);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('Erro ao salvar obrigação:', error);
      res.status(500).json({ error: 'Erro ao salvar obrigação' });
    }
  }

  static async removerObrigacao(req, res) {
    const userId = req.session.user.id;
    const { id } = req.params;

    try {
      const resultado = await CalendarioService.removeObrigacao(userId, id);
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error('Erro ao remover obrigação:', error);
      res.status(500).json({ error: 'Erro ao remover obrigação' });
    }
  }
}

module.exports = CalendarioController;

