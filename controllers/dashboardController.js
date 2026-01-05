/**
 * CONTROLLER: DashboardController
 * Painel principal do usuário
 * 
 * IMPORTANTE: Este controller REUTILIZA o CalendarioService existente.
 * Nenhuma lógica de calendário é duplicada aqui.
 * O dashboard apenas consome os dados já processados pelo service.
 */

const CalendarioService = require('../services/calendarioService');
const AssinaturaNotificacaoService = require('../services/assinaturaNotificacaoService');

class DashboardController {
  /**
   * Exibe o dashboard com calendário de obrigações
   * 
   * REUTILIZAÇÃO:
   * - Usa CalendarioService.gerarObrigacoesAutomaticas() para garantir que obrigações existam
   * - Usa CalendarioService.getCalendarioMensal() para buscar dados do calendário
   * - Nenhuma lógica de cálculo de datas está aqui
   * - Nenhuma regra de vencimento está aqui
   * - Tudo é delegado ao service existente
   */
  static async index(req, res) {
    const userId = req.session.user.id;
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    try {
      // REUTILIZA: Gera obrigações automáticas usando o mesmo service do calendário
      // Isso garante que as obrigações existam antes de buscar o calendário
      // A lógica de cálculo está toda no CalendarioService, não aqui
      try {
        // Gera obrigações para competência do mês visualizado
        await CalendarioService.gerarObrigacoesAutomaticas(userId, ano, mes);
        
        // Gera obrigações para competência do mês anterior (que vencem no mês atual)
        const mesAnterior = mes === 1 ? 12 : mes - 1;
        const anoAnterior = mes === 1 ? ano - 1 : ano;
        await CalendarioService.gerarObrigacoesAutomaticas(userId, anoAnterior, mesAnterior);
      } catch (gerarError) {
        // Se der erro ao gerar, continua mesmo assim (não quebra o dashboard)
        console.warn('⚠️ Aviso ao gerar obrigações automáticas:', gerarError.message);
      }

      // Verifica e cria notificações de assinatura prestes a vencer
      try {
        await AssinaturaNotificacaoService.verificarEVincularNotificacoes(userId);
      } catch (notifError) {
        console.warn('⚠️ Aviso ao verificar notificações de assinatura:', notifError.message);
        // Não bloqueia o dashboard se houver erro na notificação
      }

      // REUTILIZA: Busca o calendário mensal usando o mesmo service do calendário
      // Este método já retorna todos os dados processados:
      // - Dias do mês
      // - Feriados
      // - Obrigações (com cores e tipos)
      // - Anotações
      // Nenhum processamento adicional é feito aqui
      const calendario = await CalendarioService.getCalendarioMensal(userId, ano, mes);

      // Renderiza o dashboard passando os dados do calendário
      // A view apenas exibe os dados, não processa nada
      res.render('dashboard/index', {
        title: 'Dashboard - Suporte DP',
        calendario: calendario || [],
        ano,
        mes,
        mesNome: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' }),
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro no dashboard:', error);
      res.render('dashboard/index', {
        title: 'Dashboard - Suporte DP',
        calendario: [],
        ano,
        mes,
        mesNome: new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' }),
        user: req.session.user
      });
    }
  }
}

module.exports = DashboardController;

