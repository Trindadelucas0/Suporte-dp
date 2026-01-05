/**
 * MODEL: Order
 * Gerencia operações relacionadas a pedidos
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  /**
   * Cria um novo pedido
   * @param {Number} valor - Valor do pedido
   * @param {String} userId - ID do usuário (opcional, para renovação)
   * @param {String} customerEmail - Email do cliente (opcional)
   * @returns {Object} Pedido criado
   */
  static async create(valor, userId = null, customerEmail = null) {
    const orderNsu = uuidv4();
    const result = await db.query(
      `INSERT INTO orders (order_nsu, status, valor, data_criacao, user_id, customer_email)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
       RETURNING id, order_nsu, status, valor, data_criacao, user_id, customer_email, created_at`,
      [orderNsu, 'pending', valor, userId, customerEmail]
    );
    return result.rows[0];
  }

  /**
   * Busca pedido por order_nsu
   * @param {String} orderNsu - UUID do pedido
   * @returns {Object|null} Pedido encontrado
   */
  static async findByOrderNsu(orderNsu) {
    const result = await db.query(
      `SELECT id, order_nsu, status, valor, data_criacao, checkout_url, invoice_slug, user_id, customer_email, created_at, updated_at
       FROM orders
       WHERE order_nsu = $1`,
      [orderNsu]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca pedido por ID
   * @param {String} id - ID do pedido
   * @returns {Object|null} Pedido encontrado
   */
  static async findById(id) {
    const result = await db.query(
      `SELECT id, order_nsu, status, valor, data_criacao, checkout_url, invoice_slug, user_id, created_at, updated_at
       FROM orders
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Atualiza status do pedido
   * @param {String} orderNsu - UUID do pedido
   * @param {String} status - Novo status (pending, paid, cancelled)
   * @returns {Object|null} Pedido atualizado
   */
  static async updateStatus(orderNsu, status) {
    const result = await db.query(
      `UPDATE orders
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_nsu = $2
       RETURNING id, order_nsu, status, valor, data_criacao, checkout_url, invoice_slug`,
      [status, orderNsu]
    );
    return result.rows[0] || null;
  }

  /**
   * Atualiza checkout_url e invoice_slug do pedido
   * @param {String} orderNsu - UUID do pedido
   * @param {String} checkoutUrl - URL do checkout
   * @param {String} invoiceSlug - Slug da invoice
   * @returns {Object|null} Pedido atualizado
   */
  static async updateCheckoutInfo(orderNsu, checkoutUrl, invoiceSlug) {
    const result = await db.query(
      `UPDATE orders
       SET checkout_url = $1, invoice_slug = $2, updated_at = CURRENT_TIMESTAMP
       WHERE order_nsu = $3
       RETURNING id, order_nsu, status, checkout_url, invoice_slug`,
      [checkoutUrl, invoiceSlug, orderNsu]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca todos os pedidos (com paginação opcional)
   * @param {Object} filtros - Filtros de busca
   * @returns {Array} Lista de pedidos
   */
  static async findAll(filtros = {}) {
    let query = `
      SELECT id, order_nsu, status, valor, data_criacao, checkout_url, invoice_slug, user_id, created_at, updated_at
      FROM orders
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filtros.status) {
      query += ` AND status = $${paramCount++}`;
      params.push(filtros.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filtros.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(filtros.limit);
    }

    if (filtros.offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(filtros.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = Order;

