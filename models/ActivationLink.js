/**
 * MODEL: ActivationLink
 * Gerencia links de ativação de cadastro via venda
 * 
 * ⚠️ IMPORTANTE: Este modelo NÃO cria usuários automaticamente.
 * Apenas gerencia os links de cadastro gerados via webhook.
 */

const db = require('../config/database');
const crypto = require('crypto');

class ActivationLink {
  /**
   * Gera um token criptograficamente seguro
   * @returns {string} Token único de 64 caracteres
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cria um novo link de ativação
   * @param {Object} data - Dados do link
   * @param {string} data.email - Email do cliente
   * @param {string} data.nome_cliente - Nome do cliente
   * @param {string} data.plataforma - Plataforma de venda (kiwify, hotmart, kirvano)
   * @param {string} data.venda_id - ID da venda na plataforma
   * @param {Object} data.venda_data - Dados completos da venda (JSON)
   * @param {number} expiresInHours - Horas até expirar (padrão: 168 = 7 dias)
   * @returns {Promise<Object>} Link criado
   */
  static async create(data, expiresInHours = 168) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const result = await db.query(
      `INSERT INTO activation_links 
       (email, token, nome_cliente, plataforma, venda_id, venda_data, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, token, nome_cliente, plataforma, venda_id, expires_at, status, created_at`,
      [
        data.email,
        token,
        data.nome_cliente || null,
        data.plataforma,
        data.venda_id || null,
        JSON.stringify(data.venda_data || {}),
        expiresAt
      ]
    );

    return result.rows[0];
  }

  /**
   * Busca link por token
   * @param {string} token - Token do link
   * @returns {Promise<Object|null>} Link encontrado ou null
   */
  static async findByToken(token) {
    const result = await db.query(
      `SELECT id, email, token, nome_cliente, plataforma, venda_id, venda_data, 
              expires_at, status, used_at, created_at 
       FROM activation_links 
       WHERE token = $1`,
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Valida se o link pode ser usado
   * @param {string} token - Token do link
   * @returns {Promise<Object>} { valid: boolean, link: Object|null, error: string|null }
   */
  static async validateToken(token) {
    const link = await this.findByToken(token);

    if (!link) {
      return {
        valid: false,
        link: null,
        error: 'Link de ativação inválido.'
      };
    }

    // Verifica se já foi usado
    if (link.status === 'used') {
      return {
        valid: false,
        link: link,
        error: 'Este link de ativação já foi utilizado.'
      };
    }

    // Verifica se expirou
    if (link.status === 'expired' || new Date(link.expires_at) < new Date()) {
      // Marca como expirado se ainda não estiver marcado
      if (link.status !== 'expired') {
        await this.markAsExpired(link.id);
      }
      return {
        valid: false,
        link: link,
        error: 'Este link de ativação expirou.'
      };
    }

    return {
      valid: true,
      link: link,
      error: null
    };
  }

  /**
   * Marca link como usado
   * @param {string} token - Token do link
   * @returns {Promise<boolean>} Sucesso da operação
   */
  static async markAsUsed(token) {
    const result = await db.query(
      `UPDATE activation_links 
       SET status = 'used', used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE token = $1 AND status = 'pending'`,
      [token]
    );

    return result.rowCount > 0;
  }

  /**
   * Marca link como expirado
   * @param {string} id - ID do link
   * @returns {Promise<boolean>} Sucesso da operação
   */
  static async markAsExpired(id) {
    const result = await db.query(
      `UPDATE activation_links 
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND status = 'pending'`,
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * Busca links por email
   * @param {string} email - Email do cliente
   * @returns {Promise<Array>} Lista de links
   */
  static async findByEmail(email) {
    const result = await db.query(
      `SELECT id, email, token, nome_cliente, plataforma, venda_id, 
              expires_at, status, used_at, created_at 
       FROM activation_links 
       WHERE email = $1 
       ORDER BY created_at DESC`,
      [email]
    );

    return result.rows;
  }

  /**
   * Limpa links expirados (job de manutenção)
   * @returns {Promise<number>} Número de links marcados como expirados
   */
  static async cleanupExpired() {
    const result = await db.query(
      `UPDATE activation_links 
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
       WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP 
       RETURNING id`
    );

    return result.rowCount;
  }

  /**
   * Verifica se já existe link pendente para o email
   * @param {string} email - Email do cliente
   * @returns {Promise<Object|null>} Link pendente ou null
   */
  static async findPendingByEmail(email) {
    const result = await db.query(
      `SELECT id, email, token, nome_cliente, plataforma, expires_at, created_at 
       FROM activation_links 
       WHERE email = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email]
    );

    return result.rows[0] || null;
  }
}

module.exports = ActivationLink;

