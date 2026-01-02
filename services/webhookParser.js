/**
 * SERVIÇO: WebhookParser
 * Extrai dados padronizados dos webhooks das plataformas
 * 
 * Converte os diferentes formatos de webhook em um formato unificado
 */

class WebhookParser {
  /**
   * Extrai dados de venda do webhook da Kiwify
   * @param {Object} payload - Payload do webhook
   * @returns {Object|null} Dados padronizados ou null se inválido
   */
  static parseKiwify(payload) {
    try {
      // Kiwify envia evento de pagamento aprovado
      // Formato pode variar, mas geralmente tem:
      // - event: tipo do evento (ex: "order.paid")
      // - data: dados da venda
      
      if (!payload || !payload.event) {
        return null;
      }

      // Verifica se é evento de pagamento aprovado
      const paidEvents = ['order.paid', 'payment.approved', 'order.completed'];
      if (!paidEvents.includes(payload.event)) {
        console.log(`ℹ️  Evento Kiwify ignorado: ${payload.event}`);
        return null;
      }

      const order = payload.data || payload.order || {};
      const customer = order.customer || order.buyer || {};

      return {
        plataforma: 'kiwify',
        venda_id: order.id || order.order_id || order.transaction_id,
        email: customer.email || order.email,
        nome: customer.name || customer.full_name || order.customer_name,
        valor: parseFloat(order.value || order.amount || order.price || 0),
        moeda: order.currency || 'BRL',
        status: order.status || 'paid',
        produto: order.product?.name || order.product_name,
        produto_id: order.product?.id || order.product_id,
        data_venda: order.created_at || order.paid_at || new Date().toISOString(),
        dados_completos: payload
      };
    } catch (error) {
      console.error('❌ Erro ao parsear webhook Kiwify:', error);
      return null;
    }
  }

  /**
   * Extrai dados de venda do webhook da Hotmart
   * @param {Object} payload - Payload do webhook
   * @returns {Object|null} Dados padronizados ou null se inválido
   */
  static parseHotmart(payload) {
    try {
      // Hotmart envia evento de compra aprovada
      // Formato: { event: "PURCHASE_APPROVED", data: {...} }
      
      if (!payload || !payload.event) {
        return null;
      }

      // Verifica se é evento de compra aprovada
      const approvedEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_BILLET_PRINTED'];
      if (!approvedEvents.includes(payload.event)) {
        console.log(`ℹ️  Evento Hotmart ignorado: ${payload.event}`);
        return null;
      }

      const purchase = payload.data || payload.purchase || {};
      const buyer = purchase.buyer || {};

      return {
        plataforma: 'hotmart',
        venda_id: purchase.purchase_id || purchase.id || purchase.transaction,
        email: buyer.email || purchase.email || purchase.buyer_email,
        nome: buyer.name || purchase.name || purchase.buyer_name,
        valor: parseFloat(purchase.price?.value || purchase.value || purchase.price || 0),
        moeda: purchase.price?.currency_code || purchase.currency || 'BRL',
        status: purchase.status || 'APPROVED',
        produto: purchase.product?.name || purchase.product_name,
        produto_id: purchase.product?.id || purchase.product_id,
        data_venda: purchase.purchase_date || purchase.date || new Date().toISOString(),
        dados_completos: payload
      };
    } catch (error) {
      console.error('❌ Erro ao parsear webhook Hotmart:', error);
      return null;
    }
  }

  /**
   * Extrai dados de venda do webhook da Kirvano
   * @param {Object} payload - Payload do webhook
   * @returns {Object|null} Dados padronizados ou null se inválido
   */
  static parseKirvano(payload) {
    try {
      // Kirvano envia evento de venda aprovada
      // Formato pode variar
      
      if (!payload || !payload.event_type) {
        return null;
      }

      // Verifica se é evento de venda aprovada
      const approvedEvents = ['sale.approved', 'payment.approved', 'order.completed'];
      if (!approvedEvents.includes(payload.event_type)) {
        console.log(`ℹ️  Evento Kirvano ignorado: ${payload.event_type}`);
        return null;
      }

      const sale = payload.data || payload.sale || payload.order || {};
      const customer = sale.customer || sale.buyer || {};

      return {
        plataforma: 'kirvano',
        venda_id: sale.id || sale.sale_id || sale.order_id || sale.transaction_id,
        email: customer.email || sale.email || sale.customer_email,
        nome: customer.name || customer.full_name || sale.customer_name,
        valor: parseFloat(sale.amount || sale.value || sale.price || 0),
        moeda: sale.currency || 'BRL',
        status: sale.status || 'approved',
        produto: sale.product?.name || sale.product_name,
        produto_id: sale.product?.id || sale.product_id,
        data_venda: sale.created_at || sale.approved_at || new Date().toISOString(),
        dados_completos: payload
      };
    } catch (error) {
      console.error('❌ Erro ao parsear webhook Kirvano:', error);
      return null;
    }
  }

  /**
   * Parse genérico baseado na plataforma
   * @param {string} platform - Plataforma (kiwify, hotmart, kirvano)
   * @param {Object} payload - Payload do webhook
   * @returns {Object|null} Dados padronizados ou null se inválido
   */
  static parse(platform, payload) {
    switch (platform.toLowerCase()) {
      case 'kiwify':
        return this.parseKiwify(payload);
      case 'hotmart':
        return this.parseHotmart(payload);
      case 'kirvano':
        return this.parseKirvano(payload);
      default:
        console.error(`❌ Plataforma desconhecida: ${platform}`);
        return null;
    }
  }
}

module.exports = WebhookParser;

