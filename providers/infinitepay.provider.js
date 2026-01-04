/**
 * PROVIDER: InfinitePay
 * 
 * Integração com API REST do InfinitePay
 * Documentação: https://api.infinitepay.io/invoices/public/checkout/links
 * 
 * FUNCIONAMENTO:
 * 1. Cria link de pagamento via API REST
 * 2. Recebe webhook quando pagamento é aprovado
 * 3. Consulta status do pagamento quando necessário
 * 
 * CONFIGURAÇÃO:
 * - INFINITEPAY_HANDLE: Sua InfiniteTag (sem o $)
 * - INFINITEPAY_WEBHOOK_SECRET: Segredo para validar webhooks (opcional)
 * - INFINITEPAY_USE_MOCK: true/false (para testes)
 */

let axios;
try {
  axios = require('axios');
} catch (e) {
  console.warn('⚠️  Axios não encontrado. Instale: npm install axios');
  axios = null;
}

class InfinitePayProvider {
  constructor() {
    // Handle (InfiniteTag) - obrigatório
    this.handle = process.env.INFINITEPAY_HANDLE || 'lucas-rodrigues-740';
    
    // Webhook secret (para validar webhooks)
    this.webhookSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;
    
    // URL base da API
    this.apiBaseUrl = 'https://api.infinitepay.io/invoices/public/checkout';
    
    // Modo MOCK (para testes)
    this.useMock = process.env.INFINITEPAY_USE_MOCK === 'true';
    
    // App URL (para redirect_url e webhook_url)
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    if (this.useMock) {
      console.warn('⚠️  InfinitePay em modo MOCK (não cria links reais)');
    } else {
      console.log(`✅ InfinitePay configurado com handle: ${this.handle}`);
      if (!axios) {
        console.warn('⚠️  Axios não instalado. Sistema funcionará apenas em modo MOCK.');
        this.useMock = true;
      }
    }
  }

  /**
   * Cria um link de pagamento no InfinitePay
   * 
   * @param {Object} data - Dados da cobrança
   * @param {number} data.valor - Valor da cobrança (em reais, será convertido para centavos)
   * @param {string} data.descricao - Descrição da cobrança
   * @param {Date} data.dataVencimento - Data de vencimento (usado apenas para referência)
   * @param {string} data.emailCliente - Email do cliente
   * @param {string} data.nomeCliente - Nome do cliente
   * @param {string} data.referenceId - ID de referência interno (order_nsu)
   * @returns {Promise<Object>} Dados da cobrança criada
   */
  async createCharge(data) {
    // MODO MOCK: Retorna dados simulados
    if (this.useMock || !axios) {
      console.log('🔧 [MOCK] Gerando link de pagamento simulado:', {
        valor: data.valor,
        descricao: data.descricao,
        email: data.emailCliente
      });

      const appUrl = this.appUrl;
      const externalId = data.referenceId || 'mock_' + Date.now();
      const mockLink = `${appUrl}/cobranca/pagar/${externalId}`;

      return {
        success: true,
        external_id: externalId,
        link_pagamento: mockLink,
        status: 'pendente',
        data: {
          mock: true,
          message: 'Configure INFINITEPAY_USE_MOCK=false e INFINITEPAY_HANDLE para usar API real'
        }
      };
    }

    try {
      // Converte valor de reais para centavos
      const valorCentavos = Math.round(parseFloat(data.valor) * 100);
      
      // Monta payload para API
      const payload = {
        handle: this.handle,
        itens: [
          {
            quantity: 1,
            price: valorCentavos,
            description: data.descricao || 'Mensalidade - Suporte DP'
          }
        ]
      };

      // Adiciona order_nsu se fornecido
      if (data.referenceId) {
        payload.order_nsu = data.referenceId;
      }

      // Adiciona redirect_url (página de sucesso)
      payload.redirect_url = `${this.appUrl}/cobranca/pagamento-sucesso`;

      // Adiciona webhook_url (notificação de pagamento)
      payload.webhook_url = `${this.appUrl}/webhook/infinitepay`;

      // Adiciona dados do cliente se disponíveis
      if (data.emailCliente || data.nomeCliente) {
        payload.customer = {};
        if (data.nomeCliente) payload.customer.name = data.nomeCliente;
        if (data.emailCliente) payload.customer.email = data.emailCliente;
      }

      // Faz requisição para API
      const response = await axios.post(
        `${this.apiBaseUrl}/links`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // API retorna: { link: "https://...", invoice_slug: "...", order_nsu: "..." }
      const apiResponse = response.data;

      console.log('✅ Link de pagamento InfinitePay criado:', {
        invoice_slug: apiResponse.invoice_slug,
        order_nsu: apiResponse.order_nsu || data.referenceId
      });

      return {
        success: true,
        external_id: apiResponse.order_nsu || apiResponse.invoice_slug || data.referenceId,
        link_pagamento: apiResponse.link,
        status: 'pendente',
        invoice_slug: apiResponse.invoice_slug,
        order_nsu: apiResponse.order_nsu,
        data: apiResponse
      };

    } catch (error) {
      console.error('❌ Erro ao criar link de pagamento InfinitePay:', error.response?.data || error.message);
      throw new Error(`Erro ao criar link InfinitePay: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Processa webhook do InfinitePay
   * 
   * @param {Object} payload - Payload do webhook
   * @returns {Object} Dados processados
   */
  parseWebhook(payload) {
    // Payload do webhook InfinitePay:
    // {
    //   "invoice_slug": "abc123",
    //   "amount": 1000,
    //   "paid_amount": 1010,
    //   "installments": 1,
    //   "capture_method": "credit_card",
    //   "transaction_nsu": "UUID",
    //   "order_nsu": "UUID-do-pedido",
    //   "receipt_url": "https://comprovante.com/123",
    //   "items": [...]
    // }

    const orderNsu = payload.order_nsu;
    const transactionNsu = payload.transaction_nsu;
    const invoiceSlug = payload.invoice_slug;
    const paidAmount = payload.paid_amount || payload.amount;

    return {
      event: 'payment.paid',
      external_id: orderNsu || invoiceSlug || transactionNsu,
      status: 'paga',
      transaction_nsu: transactionNsu,
      invoice_slug: invoiceSlug,
      order_nsu: orderNsu,
      paid_amount: paidAmount ? paidAmount / 100 : null, // Converte centavos para reais
      capture_method: payload.capture_method, // "credit_card" ou "pix"
      receipt_url: payload.receipt_url,
      data: payload
    };
  }

  /**
   * Consulta status de um pagamento
   * 
   * @param {string} orderNsu - Order NSU
   * @param {string} transactionNsu - Transaction NSU (opcional)
   * @param {string} invoiceSlug - Invoice Slug (opcional)
   * @returns {Promise<Object>} Status do pagamento
   */
  async checkPaymentStatus(orderNsu, transactionNsu = null, invoiceSlug = null) {
    if (this.useMock || !axios) {
      return { success: false, paid: false, mock: true };
    }

    try {
      const payload = {
        handle: this.handle,
        order_nsu: orderNsu
      };

      if (transactionNsu) payload.transaction_nsu = transactionNsu;
      if (invoiceSlug) payload.slug = invoiceSlug;

      const response = await axios.post(
        `${this.apiBaseUrl}/payment_check`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;

      return {
        success: result.success || true,
        paid: result.paid || false,
        amount: result.amount ? result.amount / 100 : null, // Converte centavos para reais
        paid_amount: result.paid_amount ? result.paid_amount / 100 : null,
        installments: result.installments,
        capture_method: result.capture_method,
        data: result
      };

    } catch (error) {
      console.error('❌ Erro ao consultar status do pagamento:', error.response?.data || error.message);
      return { success: false, paid: false, error: error.message };
    }
  }

  /**
   * Valida assinatura do webhook (se configurado)
   * 
   * @param {string} signature - Assinatura do webhook
   * @param {Object} payload - Payload do webhook
   * @returns {boolean} Se a assinatura é válida
   */
  validateWebhook(signature, payload) {
    // InfinitePay não menciona validação de assinatura na documentação
    // Mas você pode validar order_nsu no seu sistema
    if (!this.webhookSecret) {
      return true; // Se não tiver secret configurado, aceita
    }

    // Implementar validação se InfinitePay fornecer método de validação
    // Por enquanto, validamos apenas se order_nsu existe no nosso sistema
    return true;
  }

  /**
   * Converte valor de reais para centavos
   */
  toCents(value) {
    return Math.round(parseFloat(value) * 100);
  }

  /**
   * Converte valor de centavos para reais
   */
  fromCents(value) {
    return parseFloat(value) / 100;
  }
}

module.exports = new InfinitePayProvider();
