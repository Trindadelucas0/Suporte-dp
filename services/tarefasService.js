/**
 * SERVICE: TarefasService
 * Lógica de negócio para tarefas
 */

const Tarefa = require('../models/Tarefa');
const db = require('../config/database');

class TarefasService {
  /**
   * Busca todas as tarefas do usuário agrupadas por status
   */
  static async getTarefasKanban(userId) {
    const tarefas = await Tarefa.findByUser(userId);
    
    // Agrupa por status
    const kanban = {
      nao_iniciado: [],
      em_andamento: [],
      feito: []
    };

    tarefas.forEach(tarefa => {
      kanban[tarefa.status].push(tarefa);
    });

    return kanban;
  }

  /**
   * Cria uma nova tarefa
   */
  static async criarTarefa(userId, data) {
    // Validações
    if (!data.nome || data.nome.trim().length === 0) {
      throw new Error('Nome da tarefa é obrigatório');
    }

    if (!data.data_vencimento) {
      throw new Error('Data de vencimento é obrigatória');
    }

    // Valida status e prioridade
    if (data.status && !['nao_iniciado', 'em_andamento', 'feito'].includes(data.status)) {
      throw new Error('Status inválido');
    }

    if (data.prioridade && !['alta', 'media', 'baixa'].includes(data.prioridade)) {
      throw new Error('Prioridade inválida');
    }

    return await Tarefa.create(userId, {
      nome: data.nome.trim(),
      tipo: data.tipo || null,
      descricao: data.descricao || null,
      prioridade: data.prioridade || 'media',
      data_vencimento: data.data_vencimento
    });
  }

  /**
   * Atualiza tarefa
   */
  static async atualizarTarefa(tarefaId, userId, data) {
    // Verifica se tarefa existe e pertence ao usuário
    const tarefa = await Tarefa.findById(tarefaId, userId);
    if (!tarefa) {
      throw new Error('Tarefa não encontrada');
    }

    // Validações
    if (data.nome !== undefined && data.nome.trim().length === 0) {
      throw new Error('Nome da tarefa não pode ser vazio');
    }

    if (data.status && !['nao_iniciado', 'em_andamento', 'feito'].includes(data.status)) {
      throw new Error('Status inválido');
    }

    if (data.prioridade && !['alta', 'media', 'baixa'].includes(data.prioridade)) {
      throw new Error('Prioridade inválida');
    }

    // Se nome está sendo atualizado, trim
    if (data.nome !== undefined) {
      data.nome = data.nome.trim();
    }

    return await Tarefa.update(tarefaId, userId, data);
  }

  /**
   * Deleta tarefa
   */
  static async deletarTarefa(tarefaId, userId) {
    const tarefa = await Tarefa.findById(tarefaId, userId);
    if (!tarefa) {
      throw new Error('Tarefa não encontrada');
    }

    // Remove notificações relacionadas
    await db.query(
      'DELETE FROM notificacoes WHERE tarefa_id = $1',
      [tarefaId]
    );

    return await Tarefa.delete(tarefaId, userId);
  }

  /**
   * Atualiza ordem das tarefas (drag & drop)
   */
  static async atualizarOrdem(userId, tarefas) {
    // Valida que todas as tarefas pertencem ao usuário
    for (const tarefa of tarefas) {
      const existe = await Tarefa.findById(tarefa.id, userId);
      if (!existe) {
        throw new Error(`Tarefa ${tarefa.id} não encontrada`);
      }
    }

    return await Tarefa.updateOrdem(userId, tarefas);
  }

  /**
   * Busca tarefas para calendário
   */
  static async getTarefasCalendario(userId, ano, mes) {
    // Primeiro e último dia do mês
    const dataInicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
    const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0];

    return await Tarefa.findByDateRange(userId, dataInicio, dataFim);
  }

  /**
   * Estatísticas de tarefas
   */
  static async getEstatisticas(userId) {
    return await Tarefa.getEstatisticas(userId);
  }

  /**
   * Tarefas do dia
   */
  static async getTarefasDoDia(userId, data = null) {
    return await Tarefa.findTarefasDoDia(userId, data);
  }

  /**
   * Cria notificações automáticas para tarefas vencendo
   */
  static async criarNotificacoesAutomaticas() {
    const notificacoesCriadas = [];

    // Tarefas vencendo hoje
    const vencendoHoje = await Tarefa.findVencendoHoje();
    for (const tarefa of vencendoHoje) {
      // Verifica se já existe notificação não lida para esta tarefa hoje
      const existeNotificacao = await db.query(
        `SELECT id FROM notificacoes 
         WHERE tarefa_id = $1 
           AND tipo = 'warning'
           AND lida = false
           AND DATE(created_at) = CURRENT_DATE`,
        [tarefa.id]
      );

      if (existeNotificacao.rows.length === 0) {
        await db.query(
          `INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, tarefa_id, link, lida)
           VALUES ($1, 'warning', 'Tarefa vence hoje', $2, $3, $4, false)`,
          [
            tarefa.user_id,
            `A tarefa "${tarefa.nome}" vence hoje.`,
            tarefa.id,
            `/tarefas?id=${tarefa.id}`
          ]
        );
        notificacoesCriadas.push({ tipo: 'vencendo_hoje', tarefa_id: tarefa.id });
      }
    }

    // Tarefas atrasadas
    const atrasadas = await Tarefa.findAtrasadas();
    for (const tarefa of atrasadas) {
      // Verifica se já existe notificação não lida para esta tarefa
      const existeNotificacao = await db.query(
        `SELECT id FROM notificacoes 
         WHERE tarefa_id = $1 
           AND tipo = 'error'
           AND lida = false`,
        [tarefa.id]
      );

      if (existeNotificacao.rows.length === 0) {
        await db.query(
          `INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, tarefa_id, link, lida)
           VALUES ($1, 'error', 'Tarefa atrasada', $2, $3, $4, false)`,
          [
            tarefa.user_id,
            `A tarefa "${tarefa.nome}" está atrasada.`,
            tarefa.id,
            `/tarefas?id=${tarefa.id}`
          ]
        );
        notificacoesCriadas.push({ tipo: 'atrasada', tarefa_id: tarefa.id });
      }
    }

    // Tarefas vencendo amanhã
    const vencendoAmanha = await Tarefa.findVencendoAmanha();
    for (const tarefa of vencendoAmanha) {
      // Verifica se já existe notificação não lida para esta tarefa hoje
      const existeNotificacao = await db.query(
        `SELECT id FROM notificacoes 
         WHERE tarefa_id = $1 
           AND tipo = 'info'
           AND lida = false
           AND DATE(created_at) = CURRENT_DATE`,
        [tarefa.id]
      );

      if (existeNotificacao.rows.length === 0) {
        await db.query(
          `INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, tarefa_id, link, lida)
           VALUES ($1, 'info', 'Tarefa vence amanhã', $2, $3, $4, false)`,
          [
            tarefa.user_id,
            `A tarefa "${tarefa.nome}" vence amanhã.`,
            tarefa.id,
            `/tarefas?id=${tarefa.id}`
          ]
        );
        notificacoesCriadas.push({ tipo: 'vencendo_amanha', tarefa_id: tarefa.id });
      }
    }

    return notificacoesCriadas;
  }
}

module.exports = TarefasService;

