/**
 * CONTROLLER: TarefasController
 * Gerencia tarefas do sistema
 */

const TarefasService = require('../services/tarefasService');
const { validationResult } = require('express-validator');

class TarefasController {
  /**
   * Exibe página Kanban de tarefas
   */
  static async index(req, res) {
    const userId = req.session.user.id;

    try {
      // Cria notificações automáticas ao acessar
      try {
        await TarefasService.criarNotificacoesAutomaticas();
      } catch (notifError) {
        console.warn('Erro ao criar notificações automáticas:', notifError.message);
      }

      const kanban = await TarefasService.getTarefasKanban(userId);
      const estatisticas = await TarefasService.getEstatisticas(userId);

      // Busca tarefa específica se ID foi passado (para abrir modal)
      const tarefaId = req.query.id;
      let tarefaSelecionada = null;
      if (tarefaId) {
        const Tarefa = require('../models/Tarefa');
        tarefaSelecionada = await Tarefa.findById(tarefaId, userId);
      }

      res.render('tarefas/index', {
        title: 'Tarefas - Suporte DP',
        kanban,
        estatisticas,
        tarefaSelecionada,
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      res.render('tarefas/index', {
        title: 'Tarefas - Suporte DP',
        kanban: { nao_iniciado: [], em_andamento: [], feito: [] },
        estatisticas: [],
        tarefaSelecionada: null,
        user: req.session.user,
        error: 'Erro ao carregar tarefas'
      });
    }
  }

  /**
   * Cria nova tarefa (POST)
   */
  static async create(req, res) {
    const userId = req.session.user.id;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const tarefa = await TarefasService.criarTarefa(userId, req.body);
      
      res.json({ 
        success: true, 
        data: tarefa 
      });
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Erro ao criar tarefa' 
      });
    }
  }

  /**
   * Atualiza tarefa (PUT)
   */
  static async update(req, res) {
    const userId = req.session.user.id;
    const { id } = req.params;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const tarefa = await TarefasService.atualizarTarefa(id, userId, req.body);
      
      if (!tarefa) {
        return res.status(404).json({ 
          success: false, 
          error: 'Tarefa não encontrada' 
        });
      }

      res.json({ 
        success: true, 
        data: tarefa 
      });
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Erro ao atualizar tarefa' 
      });
    }
  }

  /**
   * Deleta tarefa (DELETE)
   */
  static async delete(req, res) {
    const userId = req.session.user.id;
    const { id } = req.params;

    try {
      const tarefa = await TarefasService.deletarTarefa(id, userId);
      
      if (!tarefa) {
        return res.status(404).json({ 
          success: false, 
          error: 'Tarefa não encontrada' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Tarefa deletada com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Erro ao deletar tarefa' 
      });
    }
  }

  /**
   * Busca tarefa por ID (GET)
   */
  static async show(req, res) {
    const userId = req.session.user.id;
    const { id } = req.params;

    try {
      const Tarefa = require('../models/Tarefa');
      const tarefa = await Tarefa.findById(id, userId);
      
      if (!tarefa) {
        return res.status(404).json({ 
          success: false, 
          error: 'Tarefa não encontrada' 
        });
      }

      res.json({ 
        success: true, 
        data: tarefa 
      });
    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar tarefa' 
      });
    }
  }

  /**
   * Atualiza ordem das tarefas (drag & drop) (POST)
   */
  static async updateOrder(req, res) {
    const userId = req.session.user.id;
    const { tarefas } = req.body;

    try {
      if (!Array.isArray(tarefas)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Formato inválido' 
        });
      }

      await TarefasService.atualizarOrdem(userId, tarefas);
      
      res.json({ 
        success: true, 
        message: 'Ordem atualizada com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Erro ao atualizar ordem' 
      });
    }
  }

  /**
   * API: Busca tarefas para calendário
   */
  static async getForCalendar(req, res) {
    const userId = req.session.user.id;
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    try {
      const tarefas = await TarefasService.getTarefasCalendario(userId, ano, mes);
      res.json({ 
        success: true, 
        data: tarefas 
      });
    } catch (error) {
      console.error('Erro ao buscar tarefas para calendário:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar tarefas' 
      });
    }
  }

  /**
   * API: Estatísticas
   */
  static async getStats(req, res) {
    const userId = req.session.user.id;

    try {
      const estatisticas = await TarefasService.getEstatisticas(userId);
      res.json({ 
        success: true, 
        data: estatisticas 
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar estatísticas' 
      });
    }
  }
}

module.exports = TarefasController;

