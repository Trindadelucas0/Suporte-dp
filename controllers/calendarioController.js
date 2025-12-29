/**
 * CONTROLLER: CalendarioController
 * Gerencia calendário e dias úteis
 */

const CalendarioService = require('../services/calendarioService');

class CalendarioController {
  /**
   * Exibe o calendário mensal com obrigações trabalhistas
   * GERA AUTOMATICAMENTE as obrigações ao carregar o calendário
   * 
   * REGRAS DE OBRIGAÇÕES AUTOMÁTICAS:
   * - FGTS: até dia 20 do mês seguinte à competência (ajusta se fim de semana/feriado)
   * - INSS: até dia 20 do mês seguinte à competência (ajusta se fim de semana/feriado)
   * - IRRF: até dia 20 do mês seguinte à competência (ajusta se fim de semana/feriado)
   * - DCTFWeb: último dia útil do mês seguinte à competência (referente ao mês anterior)
   * - EFD-Reinf: dia 15 do mês seguinte à competência (ajusta se fim de semana/feriado)
   */
  static async index(req, res) {
    const userId = req.session.user.id;
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    try {
      // GERA AUTOMATICAMENTE as obrigações trabalhistas
      // 1. Para a competência do mês visualizado (obrigações que vencem no mês seguinte)
      // 2. Para a competência do mês anterior (obrigações que vencem no mês atual)
      try {
        // Gera obrigações para competência do mês visualizado
        await CalendarioService.gerarObrigacoesAutomaticas(userId, ano, mes);
        console.log(`✅ Obrigações automáticas geradas para competência ${mes}/${ano}`);
        
        // Gera obrigações para competência do mês anterior (que vencem no mês atual)
        const mesAnterior = mes === 1 ? 12 : mes - 1;
        const anoAnterior = mes === 1 ? ano - 1 : ano;
        await CalendarioService.gerarObrigacoesAutomaticas(userId, anoAnterior, mesAnterior);
        console.log(`✅ Obrigações automáticas geradas para competência ${mesAnterior}/${anoAnterior} (vencimento em ${mes}/${ano})`);
      } catch (gerarError) {
        // Se der erro ao gerar, continua mesmo assim (não quebra o calendário)
        // Isso permite que o calendário funcione mesmo se houver problema na geração
        console.warn('⚠️ Aviso ao gerar obrigações automáticas:', gerarError.message);
      }

      // Busca o calendário mensal com todas as obrigações, feriados e anotações
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

