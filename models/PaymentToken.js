/**
 * MODEL: PaymentToken
 * Gerencia tokens de validação de pagamento
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class PaymentToken {
  /**
   * Cria um novo token de pagamento
   * @param {String} orderNsu - UUID do pedido
   * @param {String} email - Email onde o token será enviado
   * @param {String} userId - ID do usuário (opcional)
   * @returns {Object} Token criado
   * @throws {Error} Se não houver pagamento confirmado para o order_nsu
   */
  static async create(orderNsu, email, userId = null) {
    // Validação: Verifica se há pagamento confirmado para este order_nsu
    const paymentCheck = await db.query(
      `SELECT id, status, paid_at 
       FROM payments 
       WHERE order_nsu = $1 AND status = 'paid'
       LIMIT 1`,
      [orderNsu]
    );

    if (!paymentCheck.rows || paymentCheck.rows.length === 0) {
      throw new Error(`Não é possível gerar token: Não há pagamento confirmado para o pedido ${orderNsu}. Tokens só podem ser gerados para pagamentos confirmados.`);
    }

    const token = uuidv4();
    // Token expira em 30 dias (alinhado com duração da assinatura)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await db.query(
      `INSERT INTO payment_tokens (token, order_nsu, user_id, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, token, order_nsu, user_id, email, used, expires_at, created_at`,
      [token, orderNsu, userId, email, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Valida se uma string é um UUID válido
   * @param {String} str - String para validar
   * @returns {Boolean} True se é UUID válido
   */
  static isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Busca token por valor (token string)
   * @param {String} tokenValue - Valor do token (UUID)
   * @returns {Object|null} Token encontrado
   */
  static async findByToken(tokenValue) {
    // Valida formato UUID antes de buscar no banco
    if (!tokenValue || !this.isValidUUID(tokenValue)) {
      console.warn('⚠️ [PaymentToken] Token inválido (não é UUID):', tokenValue);
      return null;
    }

    const result = await db.query(
      `SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
       FROM payment_tokens
       WHERE token = $1`,
      [tokenValue]
    );

    return result.rows[0] || null;
  }

  /**
   * Busca token válido (não usado e não expirado) por email e order_nsu
   * @param {String} email - Email
   * @param {String} orderNsu - UUID do pedido
   * @returns {Object|null} Token válido
   */
  static async findValidToken(email, orderNsu) {
    const now = new Date();
    const result = await db.query(
      `SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
       FROM payment_tokens
       WHERE email = $1 
         AND order_nsu = $2
         AND used = false
         AND expires_at > $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, orderNsu, now]
    );

    return result.rows[0] || null;
  }

  /**
   * Marca token como usado
   * @param {String} tokenValue - Valor do token (UUID)
   * @returns {Object|null} Token atualizado
   */
  static async markAsUsed(tokenValue) {
    const result = await db.query(
      `UPDATE payment_tokens
       SET used = true, used_at = CURRENT_TIMESTAMP
       WHERE token = $1 AND used = false
       RETURNING id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at`,
      [tokenValue]
    );

    return result.rows[0] || null;
  }

  /**
   * Busca tokens por order_nsu
   * @param {String} orderNsu - UUID do pedido
   * @returns {Array} Tokens encontrados
   */
  static async findByOrderNsu(orderNsu) {
    const result = await db.query(
      `SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
       FROM payment_tokens
       WHERE order_nsu = $1
       ORDER BY created_at DESC`,
      [orderNsu]
    );

    return result.rows;
  }

  /**
   * Busca token pendente (não usado e não expirado) por email
   * @param {String} email - Email do usuário
   * @returns {Object|null} Token pendente encontrado
   */
  static async findPendingTokenByEmail(email) {
    const now = new Date();
    const result = await db.query(
      `SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
       FROM payment_tokens
       WHERE email = $1 
         AND used = false
         AND expires_at > $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [email.toLowerCase(), now]
    );

    return result.rows[0] || null;
  }

  /**
   * Verifica se há token gerado nos últimos 30 dias para um usuário
   * @param {String} email - Email do usuário
   * @param {String} userId - ID do usuário (opcional)
   * @returns {Object|null} Token gerado nos últimos 30 dias
   */
  static async findRecentToken(email, userId = null) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let query = `
      SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
      FROM payment_tokens
      WHERE email = $1 
        AND created_at >= $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    let params = [email.toLowerCase(), thirtyDaysAgo];
    
    // Se userId foi fornecido, também busca por user_id
    if (userId) {
      query = `
        SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
        FROM payment_tokens
        WHERE (email = $1 OR user_id = $2)
          AND created_at >= $3
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [email.toLowerCase(), userId, thirtyDaysAgo];
    }
    
    const result = await db.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Cria um novo token de pagamento (versão com client de transação)
   * @param {String} orderNsu - UUID do pedido
   * @param {String} email - Email onde o token será enviado
   * @param {String} userId - ID do usuário (opcional)
   * @param {Object} client - Client da transação (opcional)
   * @returns {Object} Token criado
   * @throws {Error} Se não houver pagamento confirmado para o order_nsu
   */
  static async createWithClient(orderNsu, email, userId = null, client = null) {
    const dbClient = client || db;
    
    // Validação: Verifica se há pagamento confirmado para este order_nsu
    const paymentCheck = await dbClient.query(
      `SELECT id, status, paid_at 
       FROM payments 
       WHERE order_nsu = $1 AND status = 'paid'
       LIMIT 1`,
      [orderNsu]
    );

    if (!paymentCheck.rows || paymentCheck.rows.length === 0) {
      throw new Error(`Não é possível gerar token: Não há pagamento confirmado para o pedido ${orderNsu}. Tokens só podem ser gerados para pagamentos confirmados.`);
    }

    const token = uuidv4();
    // Token expira em 30 dias (alinhado com duração da assinatura)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const result = await dbClient.query(
      `INSERT INTO payment_tokens (token, order_nsu, user_id, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, token, order_nsu, user_id, email, used, expires_at, created_at`,
      [token, orderNsu, userId, email, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Atualiza email de tokens pendentes (não usados) de um usuário
   * Usado quando usuário altera seu email no perfil
   * @param {String} userId - ID do usuário
   * @param {String} novoEmail - Novo email do usuário
   * @returns {Number} Número de tokens atualizados
   */
  static async updateEmailByUserId(userId, novoEmail) {
    if (!userId || !novoEmail) {
      return 0;
    }

    const result = await db.query(
      `UPDATE payment_tokens
       SET email = $1
       WHERE user_id = $2 
         AND used = false
         AND expires_at > CURRENT_TIMESTAMP
       RETURNING id, token, order_nsu, email`,
      [novoEmail.toLowerCase(), userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Busca tokens pendentes por user_id
   * @param {String} userId - ID do usuário
   * @returns {Array} Tokens pendentes encontrados
   */
  static async findPendingTokensByUserId(userId) {
    const now = new Date();
    const result = await db.query(
      `SELECT id, token, order_nsu, user_id, email, used, expires_at, used_at, created_at
       FROM payment_tokens
       WHERE user_id = $1 
         AND used = false
         AND expires_at > $2
       ORDER BY created_at DESC`,
      [userId, now]
    );

    return result.rows;
  }
}

module.exports = PaymentToken;

