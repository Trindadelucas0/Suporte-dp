/**
 * MODEL: Tarefa
 * Gerencia operações relacionadas a tarefas
 */

const db = require('../config/database');

class Tarefa {
  /**
   * Cria uma nova tarefa
   */
  static async create(userId, data) {
    const { nome, tipo, descricao, prioridade, data_vencimento } = data;
    
    // Busca a última ordem da coluna 'nao_iniciado' para definir ordem
    const ordemResult = await db.query(
      'SELECT COALESCE(MAX(ordem), 0) as max_ordem FROM tarefas WHERE user_id = $1 AND status = $2',
      [userId, 'nao_iniciado']
    );
    const ordem = (ordemResult.rows[0].max_ordem || 0) + 1;

    const result = await db.query(
      `INSERT INTO tarefas (
        user_id, nome, tipo, descricao, prioridade, data_vencimento, ordem
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [userId, nome, tipo || null, descricao || null, prioridade || 'media', data_vencimento, ordem]
    );
    
    return result.rows[0];
  }

  /**
   * Busca tarefa por ID
   */
  static async findById(id, userId) {
    const result = await db.query(
      'SELECT * FROM tarefas WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca todas as tarefas do usuário agrupadas por status
   */
  static async findByUser(userId) {
    const result = await db.query(
      `SELECT * FROM tarefas 
       WHERE user_id = $1 
       ORDER BY 
         CASE status 
           WHEN 'nao_iniciado' THEN 1 
           WHEN 'em_andamento' THEN 2 
           WHEN 'feito' THEN 3 
         END,
         CASE prioridade 
           WHEN 'alta' THEN 1 
           WHEN 'media' THEN 2 
           WHEN 'baixa' THEN 3 
         END,
         data_vencimento ASC,
         ordem ASC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Busca tarefas por status
   */
  static async findByStatus(userId, status) {
    const result = await db.query(
      `SELECT * FROM tarefas 
       WHERE user_id = $1 AND status = $2
       ORDER BY 
         CASE prioridade 
           WHEN 'alta' THEN 1 
           WHEN 'media' THEN 2 
           WHEN 'baixa' THEN 3 
         END,
         data_vencimento ASC,
         ordem ASC`,
      [userId, status]
    );
    return result.rows;
  }

  /**
   * Busca tarefas para calendário (por período)
   */
  static async findByDateRange(userId, dataInicio, dataFim) {
    const result = await db.query(
      `SELECT * FROM tarefas 
       WHERE user_id = $1 
         AND data_vencimento BETWEEN $2 AND $3
       ORDER BY data_vencimento ASC, prioridade DESC`,
      [userId, dataInicio, dataFim]
    );
    return result.rows;
  }

  /**
   * Atualiza tarefa
   */
  static async update(id, userId, data) {
    const { nome, tipo, descricao, status, prioridade, data_vencimento, data_conclusao, ordem } = data;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (tipo !== undefined) {
      updates.push(`tipo = $${paramCount++}`);
      values.push(tipo || null);
    }
    if (descricao !== undefined) {
      updates.push(`descricao = $${paramCount++}`);
      values.push(descricao || null);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (prioridade !== undefined) {
      updates.push(`prioridade = $${paramCount++}`);
      values.push(prioridade);
    }
    if (data_vencimento !== undefined) {
      updates.push(`data_vencimento = $${paramCount++}`);
      values.push(data_vencimento);
    }
    if (data_conclusao !== undefined) {
      updates.push(`data_conclusao = $${paramCount++}`);
      values.push(data_conclusao || null);
    }
    if (ordem !== undefined) {
      updates.push(`ordem = $${paramCount++}`);
      values.push(ordem);
    }

    if (updates.length === 0) {
      return await this.findById(id, userId);
    }

    values.push(id, userId);
    const result = await db.query(
      `UPDATE tarefas 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Deleta tarefa
   */
  static async delete(id, userId) {
    const result = await db.query(
      'DELETE FROM tarefas WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca tarefas vencendo hoje
   */
  static async findVencendoHoje() {
    const result = await db.query(
      `SELECT * FROM tarefas 
       WHERE data_vencimento = CURRENT_DATE
         AND status != 'feito'`,
      []
    );
    return result.rows;
  }

  /**
   * Busca tarefas atrasadas
   */
  static async findAtrasadas() {
    const result = await db.query(
      `SELECT * FROM tarefas 
       WHERE data_vencimento < CURRENT_DATE
         AND status != 'feito'`,
      []
    );
    return result.rows;
  }

  /**
   * Busca tarefas que vencem amanhã
   */
  static async findVencendoAmanha() {
    const result = await db.query(
      `SELECT * FROM tarefas 
       WHERE data_vencimento = CURRENT_DATE + INTERVAL '1 day'
         AND status = 'nao_iniciado'`,
      []
    );
    return result.rows;
  }

  /**
   * Atualiza ordem de múltiplas tarefas (drag & drop)
   */
  static async updateOrdem(userId, tarefas) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const tarefa of tarefas) {
        await client.query(
          'UPDATE tarefas SET ordem = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4',
          [tarefa.ordem, tarefa.status, tarefa.id, userId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Estatísticas de tarefas do usuário
   */
  static async getEstatisticas(userId) {
    const result = await db.query(
      `SELECT 
        status,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE prioridade = 'alta') as alta,
        COUNT(*) FILTER (WHERE prioridade = 'media') as media,
        COUNT(*) FILTER (WHERE prioridade = 'baixa') as baixa
      FROM tarefas
      WHERE user_id = $1
      GROUP BY status`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Tarefas do dia
   */
  static async findTarefasDoDia(userId, data = null) {
    const dataBusca = data || new Date().toISOString().split('T')[0];
    const result = await db.query(
      `SELECT * FROM tarefas
       WHERE user_id = $1
         AND data_vencimento = $2
         AND status != 'feito'
       ORDER BY 
         CASE prioridade 
           WHEN 'alta' THEN 1 
           WHEN 'media' THEN 2 
           WHEN 'baixa' THEN 3 
         END`,
      [userId, dataBusca]
    );
    return result.rows;
  }
}

module.exports = Tarefa;

