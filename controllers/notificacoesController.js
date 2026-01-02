/**
 * CONTROLLER: NotificacoesController
 * Gerencia notificações do sistema
 */

const db = require('../config/database');

class NotificacoesController {
  /**
   * Busca notificações não lidas do usuário
   */
  static async getNaoLidas(req, res) {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    try {
      const result = await db.query(
        `SELECT 
          n.id,
          n.tipo,
          n.titulo,
          n.mensagem,
          n.link,
          n.tarefa_id,
          n.created_at,
          t.nome as tarefa_nome
        FROM notificacoes n
        LEFT JOIN tarefas t ON n.tarefa_id = t.id
        WHERE n.user_id = $1
          AND n.lida = false
        ORDER BY n.created_at DESC
        LIMIT 50`,
        [userId]
      );

      // Converte UUIDs para string para garantir compatibilidade
      const notificacoes = result.rows.map(row => ({
        ...row,
        id: row.id?.toString() || row.id,
        tarefa_id: row.tarefa_id?.toString() || row.tarefa_id
      }));

      res.json({
        success: true,
        data: notificacoes || [],
        count: notificacoes.length
      });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar notificações'
      });
    }
  }

  /**
   * Busca todas as notificações do usuário
   */
  static async getAll(req, res) {
    const userId = req.session.user.id;

    try {
      const result = await db.query(
        `SELECT 
          n.id,
          n.tipo,
          n.titulo,
          n.mensagem,
          n.link,
          n.tarefa_id,
          n.lida,
          n.created_at,
          t.nome as tarefa_nome
        FROM notificacoes n
        LEFT JOIN tarefas t ON n.tarefa_id = t.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 100`,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows || []
      });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar notificações'
      });
    }
  }

  /**
   * Marca notificação como lida
   */
  static async marcarComoLida(req, res) {
    const userId = req.session.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID da notificação não fornecido'
      });
    }

    try {
      console.log('Marcando notificação como lida:', { id, userId, idType: typeof id });
      
      // Tenta atualizar usando UUID diretamente primeiro
      let result;
      try {
        result = await db.query(
          `UPDATE notificacoes 
           SET lida = true 
           WHERE id = $1::uuid AND user_id = $2::uuid
           RETURNING *`,
          [id, userId]
        );
      } catch (uuidError) {
        // Se falhar com UUID, tenta como texto
        console.log('Tentando como texto:', uuidError.message);
        result = await db.query(
          `UPDATE notificacoes 
           SET lida = true 
           WHERE id::text = $1 AND user_id::text = $2
           RETURNING *`,
          [id, userId]
        );
      }

      console.log('Resultado da atualização:', result.rows.length);

      if (result.rows.length === 0) {
        // Verifica se a notificação existe
        const checkResult = await db.query(
          `SELECT id, user_id, lida FROM notificacoes WHERE id::text = $1 OR id = $1::uuid`,
          [id]
        );
        
        if (checkResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Notificação não encontrada'
          });
        }
        
        const notif = checkResult.rows[0];
        if (notif.user_id.toString() !== userId.toString()) {
          return res.status(403).json({
            success: false,
            error: 'Notificação não pertence ao usuário'
          });
        }
        
        if (notif.lida) {
          return res.status(400).json({
            success: false,
            error: 'Notificação já está marcada como lida'
          });
        }
        
        return res.status(500).json({
          success: false,
          error: 'Erro ao atualizar notificação'
        });
      }

      res.json({
        success: true,
        message: 'Notificação marcada como lida'
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Erro ao marcar notificação como lida: ' + error.message
      });
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  static async marcarTodasComoLidas(req, res) {
    const userId = req.session.user.id;

    try {
      await db.query(
        `UPDATE notificacoes 
         SET lida = true 
         WHERE user_id = $1 AND lida = false`,
        [userId]
      );

      res.json({
        success: true,
        message: 'Todas as notificações foram marcadas como lidas'
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao marcar notificações como lidas'
      });
    }
  }

  /**
   * Conta notificações não lidas
   */
  static async getCount(req, res) {
    const userId = req.session.user.id;

    try {
      const result = await db.query(
        `SELECT COUNT(*) as count 
         FROM notificacoes 
         WHERE user_id = $1 AND lida = false`,
        [userId]
      );

      res.json({
        success: true,
        count: parseInt(result.rows[0].count || 0)
      });
    } catch (error) {
      console.error('Erro ao contar notificações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao contar notificações'
      });
    }
  }
}

module.exports = NotificacoesController;

