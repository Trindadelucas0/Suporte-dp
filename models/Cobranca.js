/**
 * MODEL: Cobranca
 * Gerencia operações relacionadas a cobranças
 */

const db = require('../config/database');

class Cobranca {
  /**
   * Cria uma nova cobrança
   * @param {Object} data - Dados da cobrança
   * @returns {Promise<Object>} Cobrança criada
   */
  static async create(data) {
    const {
      user_id,
      external_id,
      valor,
      status = 'pendente',
      data_vencimento,
      link_pagamento,
      mes_referencia
    } = data;

    const result = await db.query(
      `INSERT INTO cobrancas 
       (user_id, external_id, valor, status, data_vencimento, link_pagamento, mes_referencia, lembretes_enviados)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, external_id, valor, status, data_vencimento, link_pagamento, mes_referencia, JSON.stringify([])]
    );

    return result.rows[0];
  }

  /**
   * Busca cobrança por ID
   * @param {string} id - ID da cobrança
   * @returns {Promise<Object|null>} Cobrança encontrada
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM cobrancas WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca cobrança por external_id
   * @param {string} externalId - ID externo (InfinitePay)
   * @returns {Promise<Object|null>} Cobrança encontrada
   */
  static async findByExternalId(externalId) {
    const result = await db.query(
      'SELECT * FROM cobrancas WHERE external_id = $1',
      [externalId]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca cobrança por user_id e mês
   * @param {string} userId - ID do usuário
   * @param {string} mesReferencia - Mês no formato YYYY-MM
   * @returns {Promise<Object|null>} Cobrança encontrada
   */
  static async findByUserAndMonth(userId, mesReferencia) {
    const result = await db.query(
      'SELECT * FROM cobrancas WHERE user_id = $1 AND mes_referencia = $2',
      [userId, mesReferencia]
    );
    return result.rows[0] || null;
  }

  /**
   * Busca todas as cobranças de um usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} Lista de cobranças
   */
  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM cobrancas WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  /**
   * Busca cobranças pendentes por data de vencimento
   * @param {Date} dataInicio - Data inicial
   * @param {Date} dataFim - Data final
   * @returns {Promise<Array>} Lista de cobranças
   */
  static async findPendingByDateRange(dataInicio, dataFim) {
    const result = await db.query(
      `SELECT * FROM cobrancas 
       WHERE status = 'pendente' 
       AND data_vencimento BETWEEN $1 AND $2
       ORDER BY data_vencimento ASC`,
      [dataInicio, dataFim]
    );
    return result.rows;
  }

  /**
   * Busca cobranças vencidas
   * @param {Date} dataLimite - Data limite (geralmente hoje)
   * @returns {Promise<Array>} Lista de cobranças vencidas
   */
  static async findOverdue(dataLimite) {
    const result = await db.query(
      `SELECT * FROM cobrancas 
       WHERE status = 'pendente' 
       AND data_vencimento < $1
       ORDER BY data_vencimento ASC`,
      [dataLimite]
    );
    return result.rows;
  }

  /**
   * Atualiza status da cobrança
   * @param {string} id - ID da cobrança
   * @param {Object} data - Dados para atualizar
   * @returns {Promise<Object|null>} Cobrança atualizada
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.data_pagamento !== undefined) {
      fields.push(`data_pagamento = $${paramCount++}`);
      values.push(data.data_pagamento);
    }
    if (data.link_pagamento !== undefined) {
      fields.push(`link_pagamento = $${paramCount++}`);
      values.push(data.link_pagamento);
    }
    if (data.external_id !== undefined) {
      fields.push(`external_id = $${paramCount++}`);
      values.push(data.external_id);
    }
    if (data.lembretes_enviados !== undefined) {
      fields.push(`lembretes_enviados = $${paramCount++}`);
      values.push(JSON.stringify(data.lembretes_enviados));
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE cobrancas SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);

    return result.rows[0] || null;
  }

  /**
   * Adiciona lembrete enviado
   * @param {string} id - ID da cobrança
   * @param {string} tipoLembrete - Tipo do lembrete
   * @returns {Promise<Object|null>} Cobrança atualizada
   */
  static async addLembreteEnviado(id, tipoLembrete) {
    const cobranca = await this.findById(id);
    if (!cobranca) return null;

    const lembretes = Array.isArray(cobranca.lembretes_enviados) 
      ? cobranca.lembretes_enviados 
      : JSON.parse(cobranca.lembretes_enviados || '[]');

    const novoLembrete = {
      tipo: tipoLembrete,
      data: new Date().toISOString()
    };

    if (!lembretes.find(l => l.tipo === tipoLembrete)) {
      lembretes.push(novoLembrete);
      return await this.update(id, { lembretes_enviados: lembretes });
    }

    return cobranca;
  }

  /**
   * Marca cobrança como paga
   * @param {string} id - ID da cobrança
   * @param {Date} dataPagamento - Data do pagamento
   * @returns {Promise<Object|null>} Cobrança atualizada
   */
  static async markAsPaid(id, dataPagamento = new Date()) {
    return await this.update(id, {
      status: 'paga',
      data_pagamento: dataPagamento
    });
  }

  /**
   * Marca cobrança como vencida
   * @param {string} id - ID da cobrança
   * @returns {Promise<Object|null>} Cobrança atualizada
   */
  static async markAsOverdue(id) {
    return await this.update(id, {
      status: 'vencida'
    });
  }
}

module.exports = Cobranca;

