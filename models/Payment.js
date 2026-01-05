/**
 * MODEL: Payment
 * Gerencia operações relacionadas a pagamentos
 */

const db = require('../config/database');

class Payment {
  /**
   * Cria um novo pagamento
   * @param {Object} dados - Dados do pagamento
   * @returns {Object} Pagamento criado
   */
  static async create(dados) {
    const {
      order_nsu,
      user_id,
      transaction_nsu,
      invoice_slug,
      amount,
      paid_amount,
      capture_method,
      receipt_url,
      status,
      paid_at,
      next_billing_date
    } = dados;

    const result = await db.query(
      `INSERT INTO payments (
        order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
        capture_method, receipt_url, status, paid_at, next_billing_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
                capture_method, receipt_url, status, paid_at, next_billing_date, created_at`,
      [
        order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
        capture_method, receipt_url, status, paid_at, next_billing_date
      ]
    );
    return result.rows[0];
  }

  /**
   * Busca pagamento por transaction_nsu
   * @param {String} transactionNsu - NSU da transação
   * @returns {Object|null} Pagamento encontrado
   */
  static async findByTransactionNsu(transactionNsu) {
    const result = await db.query(
      `SELECT id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
              capture_method, receipt_url, status, paid_at, next_billing_date, created_at
       FROM payments
       WHERE transaction_nsu = $1`,
      [transactionNsu]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca pagamento por order_nsu
   * @param {String} orderNsu - UUID do pedido
   * @returns {Object|null} Pagamento encontrado
   */
  static async findByOrderNsu(orderNsu) {
    const result = await db.query(
      `SELECT id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
              capture_method, receipt_url, status, paid_at, next_billing_date, created_at
       FROM payments
       WHERE order_nsu = $1
       ORDER BY paid_at DESC
       LIMIT 1`,
      [orderNsu]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca todos os pagamentos de um usuário
   * @param {String} userId - ID do usuário
   * @returns {Array} Lista de pagamentos
   */
  static async findByUserId(userId) {
    const result = await db.query(
      `SELECT id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
              capture_method, receipt_url, status, paid_at, next_billing_date, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY paid_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Busca todos os pagamentos de um order_nsu
   * @param {String} orderNsu - UUID do pedido
   * @returns {Array} Lista de pagamentos
   */
  static async findAllByOrderNsu(orderNsu) {
    const result = await db.query(
      `SELECT id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
              capture_method, receipt_url, status, paid_at, next_billing_date, created_at
       FROM payments
       WHERE order_nsu = $1
       ORDER BY paid_at DESC`,
      [orderNsu]
    );
    return result.rows;
  }

  /**
   * Atualiza user_id do pagamento (quando usuário se cadastra)
   * @param {String} paymentId - ID do pagamento
   * @param {String} userId - ID do usuário
   * @returns {Object|null} Pagamento atualizado
   */
  static async updateUserId(paymentId, userId) {
    const result = await db.query(
      `UPDATE payments
       SET user_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, order_nsu, user_id, transaction_nsu, amount, paid_amount, paid_at`,
      [userId, paymentId]
    );
    return result.rows[0] || null;
  }

  /**
   * Atualiza user_id do pagamento por order_nsu
   * @param {String} orderNsu - UUID do pedido
   * @param {String} userId - ID do usuário
   * @returns {Object|null} Pagamento atualizado
   */
  static async updateUserIdByOrderNsu(orderNsu, userId) {
    const result = await db.query(
      `UPDATE payments
       SET user_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_nsu = $2 AND user_id IS NULL
       RETURNING id, order_nsu, user_id, transaction_nsu, amount, paid_amount, paid_at`,
      [userId, orderNsu]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca pagamento aprovado (status = 'paid') por order_nsu
   * @param {String} orderNsu - UUID do pedido
   * @returns {Object|null} Pagamento encontrado
   */
  static async findPaidByOrderNsu(orderNsu) {
    const result = await db.query(
      `SELECT id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
              capture_method, receipt_url, status, paid_at, next_billing_date, created_at
       FROM payments
       WHERE order_nsu = $1 AND status = 'paid'
       ORDER BY paid_at DESC
       LIMIT 1`,
      [orderNsu]
    );
    return result.rows[0] || null;
  }
}

module.exports = Payment;



