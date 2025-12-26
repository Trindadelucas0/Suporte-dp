/**
 * MODEL: User
 * Gerencia operações relacionadas a usuários
 */

const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static async create(nome, email, senha, isAdmin = false) {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await db.query(
      'INSERT INTO users (nome, email, senha_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, is_admin',
      [nome, email, senhaHash, isAdmin]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await db.query(
      'SELECT id, nome, email, senha_hash, is_admin FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT id, nome, email, is_admin FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async verifyPassword(senha, hash) {
    return await bcrypt.compare(senha, hash);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.nome) {
      fields.push(`nome = $${paramCount++}`);
      values.push(data.nome);
    }
    if (data.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.senha) {
      const senhaHash = await bcrypt.hash(data.senha, 10);
      fields.push(`senha_hash = $${paramCount++}`);
      values.push(senhaHash);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, nome, email, is_admin`;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }
}

module.exports = User;

