/**
 * MODEL: Feriado
 * Gerencia operações relacionadas a feriados
 */

const db = require('../config/database');

class Feriado {
  static async findAll(year = null) {
    let query = 'SELECT * FROM feriados';
    let params = [];
    
    if (year) {
      query += ' WHERE EXTRACT(YEAR FROM data) = $1';
      params.push(year);
    }
    
    query += ' ORDER BY data';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  static async findByDate(date) {
    const result = await db.query(
      'SELECT * FROM feriados WHERE data = $1',
      [date]
    );
    return result.rows[0] || null;
  }

  static async create(data, nome, tipo = 'nacional', observacao = null) {
    const result = await db.query(
      'INSERT INTO feriados (data, nome, tipo, observacao) VALUES ($1, $2, $3, $4) RETURNING *',
      [data, nome, tipo, observacao]
    );
    return result.rows[0];
  }

  static async isFeriado(date) {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM feriados WHERE data = $1',
      [date]
    );
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = Feriado;

