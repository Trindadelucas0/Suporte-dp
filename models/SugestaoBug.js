/**
 * MODEL: SugestaoBug
 * Gerencia operações relacionadas a sugestões e bugs
 */

const db = require('../config/database');

class SugestaoBug {
  /**
   * Cria uma nova sugestão ou bug
   */
  static async create(userId, tipo, titulo, descricao) {
    const result = await db.query(
      `INSERT INTO sugestoes_bugs (user_id, tipo, titulo, descricao)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, tipo, titulo, descricao]
    );
    return result.rows[0];
  }

  /**
   * Busca todas as sugestões/bugs de um usuário
   */
  static async findByUserId(userId) {
    const result = await db.query(
      `SELECT * FROM sugestoes_bugs 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Busca todas as sugestões/bugs (para admin)
   */
  static async findAll(filtros = {}) {
    let query = 'SELECT s.*, u.nome as usuario_nome, u.email as usuario_email FROM sugestoes_bugs s JOIN users u ON s.user_id = u.id WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filtros.status) {
      query += ` AND s.status = $${paramCount++}`;
      params.push(filtros.status);
    }

    if (filtros.tipo) {
      query += ` AND s.tipo = $${paramCount++}`;
      params.push(filtros.tipo);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Busca uma sugestão/bug por ID
   */
  static async findById(id) {
    const result = await db.query(
      `SELECT s.*, u.nome as usuario_nome, u.email as usuario_email 
       FROM sugestoes_bugs s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Atualiza status e resposta de uma sugestão/bug (admin)
   */
  static async updateStatus(id, status, respostaAdmin = null) {
    const result = await db.query(
      `UPDATE sugestoes_bugs 
       SET status = $1, 
           resposta_admin = $2,
           responded_at = CASE WHEN $1 != 'aberta' THEN CURRENT_TIMESTAMP ELSE responded_at END
       WHERE id = $3
       RETURNING *`,
      [status, respostaAdmin, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Conta sugestões/bugs por status
   */
  static async countByStatus() {
    const result = await db.query(
      `SELECT status, COUNT(*) as total 
       FROM sugestoes_bugs 
       GROUP BY status`
    );
    return result.rows;
  }
}

module.exports = SugestaoBug;




