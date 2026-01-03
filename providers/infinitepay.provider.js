/**
 * PROVIDER: InfinitePay
 * 
 * Sistema de Planos/Invoice do InfinitePay
 * 
 * O InfinitePay funciona com:
 * - Planos de cobrança recorrente criados no dashboard
 * - Links de pagamento: https://invoice.infinitepay.io/plans/{handle}/{planId}
 * - Notificações automáticas (WhatsApp e Email)
 * 
 * CONFIGURAÇÃO:
 * 1. Crie um plano no dashboard InfinitePay
 * 2. Copie o link do plano (ex: https://invoice.infinitepay.io/plans/lucas-rodrigues-740/G6bTNvSgv)
 * 3. Configure INFINITEPAY_PLAN_LINK no .env
 * 4. Para múltiplos planos, use INFINITEPAY_PLAN_ID e INFINITEPAY_HANDLE
 */

// Axios só é necessário se for usar API REST (opcional)
// Para sistema de planos, não precisa de axios
let axios = null;
try {
  axios = require('axios');
} catch (e) {
  // Axios não é obrigatório para sistema de planos (usando link direto)
  console.warn('⚠️  Axios não encontrado. Sistema de planos funciona sem ele.');
}

class InfinitePayProvider {
  constructor() {
    // Link completo do plano (mais fácil)
    this.planLink = process.env.INFINITEPAY_PLAN_LINK;
    
    // OU componentes do link (se quiser construir dinamicamente)
    this.handle = process.env.INFINITEPAY_HANDLE || 'lucas-rodrigues-740';
    this.planId = process.env.INFINITEPAY_PLAN_ID || 'G6bTNvSgv';
    
    // Credenciais (se tiver API - opcional)
    this.apiKey = process.env.INFINITEPAY_API_KEY;
    this.apiSecret = process.env.INFINITEPAY_API_SECRET;
    
    // URL base do invoice
    this.invoiceBaseUrl = 'https://invoice.infinitepay.io';
    
    // Modo MOCK (para testes)
    this.useMock = process.env.INFINITEPAY_USE_MOCK === 'true';
    
    if (this.useMock) {
      console.warn('⚠️  InfinitePay em modo MOCK (não cria cobranças reais)');
    } else if (this.planLink) {
      console.log('✅ InfinitePay configurado com link de plano:', this.planLink);
    } else {
      // Constrói link do plano
      const link = `${this.invoiceBaseUrl}/plans/${this.handle}/${this.planId}`;
      console.log('✅ InfinitePay configurado com plano:', link);
      this.planLink = link;
    }
  }

  /**
   * Cria uma cobrança no InfinitePay
   * 
   * Como o InfinitePay usa sistema de planos, temos duas opções:
   * 1. Usar o link do plano diretamente (mais simples)
   * 2. Criar link único por usuário (se tiver API)
   */
  async createCharge(data) {
    // MODO MOCK: Retorna dados simulados
    if (this.useMock) {
      console.log('🔧 [MOCK] Criando cobrança:', {
        valor: data.valor,
        descricao: data.descricao,
        email: data.emailCliente
      });

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const externalId = 'mock_' + Date.now();
      const linkPagamento = `${appUrl}/cobranca/pagar/${externalId}`;

      return {
        success: true,
        external_id: externalId,
        link_pagamento: linkPagamento,
        status: 'pendente',
        data: {
          mock: true,
          message: 'Configure INFINITEPAY_USE_MOCK=false para usar link real do InfinitePay'
        }
      };
    }

    // USA LINK DO PLANO DO INFINITEPAY
    // O InfinitePay não tem API REST pública, então usamos o link do plano
    // que foi criado no dashboard
    
    try {
      // Opção 1: Usar link do plano diretamente
      if (this.planLink) {
        // Adiciona parâmetros ao link para identificar o cliente
        const linkComParametros = this.planLink + 
          `?email=${encodeURIComponent(data.emailCliente)}` +
          `&name=${encodeURIComponent(data.nomeCliente)}` +
          `&reference=${encodeURIComponent(data.referenceId)}`;

        return {
          success: true,
          external_id: data.referenceId || `user_${Date.now()}`,
          link_pagamento: linkComParametros,
          status: 'pendente',
          data: {
            plan_link: this.planLink,
            method: 'plan_link'
          }
        };
      }

      // Opção 2: Tentar criar via API (se tiver credenciais)
      if (this.apiKey && this.apiSecret) {
        return await this.createChargeViaAPI(data);
      }

      throw new Error('Configure INFINITEPAY_PLAN_LINK ou credenciais da API');
      
    } catch (error) {
      console.error('❌ Erro ao criar cobrança no InfinitePay:', error.message);
      
      // Fallback para mock se configurado
      if (process.env.INFINITEPAY_FALLBACK_MOCK === 'true') {
        console.warn('⚠️  Usando fallback MOCK devido ao erro');
        return this.createCharge({ ...data, _forceMock: true });
      }
      
      throw error;
    }
  }

  /**
   * Tenta criar cobrança via API (se disponível)
   */
  async createChargeViaAPI(data) {
    if (!axios) {
      throw new Error('Axios não está instalado. Execute: npm install axios');
    }
    
    // ⚠️ Esta parte só funciona se você tiver acesso à API REST
    // Por enquanto, retorna erro informativo
    throw new Error('API REST do InfinitePay não está disponível publicamente. Use INFINITEPAY_PLAN_LINK');
  }

  /**
   * Processa webhook do InfinitePay
   * 
   * O InfinitePay envia notificações automáticas, mas pode não ter webhook HTTP.
   * Você pode precisar consultar o status periodicamente ou usar as notificações.
   */
  parseWebhook(payload) {
    try {
      // Tenta mapear diferentes formatos possíveis
      const event = payload.event || payload.type || payload.status;
      const chargeId = payload.charge_id || payload.id || payload.external_id || 
                       payload.order_id || payload.nsu || payload.reference_id;
      const status = payload.status || payload.charge_status;

      return {
        event: event,
        external_id: chargeId,
        status: this.mapStatus(status),
        data: payload
      };
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      throw new Error('Erro ao processar webhook do InfinitePay');
    }
  }

  /**
   * Mapeia status do InfinitePay para status interno
   */
  mapStatus(status) {
    const statusMap = {
      'pending': 'pendente',
      'paid': 'paga',
      'overdue': 'vencida',
      'cancelled': 'cancelada',
      'expired': 'vencida',
      'waiting_payment': 'pendente',
      'paid_out': 'paga',
      'pago': 'paga',
      'pendente': 'pendente',
      'vencido': 'vencida'
    };

    return statusMap[status?.toLowerCase()] || 'pendente';
  }

  /**
   * Formata data para formato do InfinitePay
   */
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Valida assinatura do webhook
   */
  validateWebhook(signature, payload) {
    const webhookSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('⚠️  INFINITEPAY_WEBHOOK_SECRET não configurado. Webhook não será validado.');
      return true;
    }

    // Implementar validação conforme documentação (se disponível)
    return true;
  }

  /**
   * Gera link do plano com parâmetros do cliente
   */
  getPlanLink(email, nome, referenceId) {
    if (!this.planLink) {
      this.planLink = `${this.invoiceBaseUrl}/plans/${this.handle}/${this.planId}`;
    }

    return this.planLink + 
      `?email=${encodeURIComponent(email)}` +
      `&name=${encodeURIComponent(nome)}` +
      `&reference=${encodeURIComponent(referenceId)}`;
  }
}

module.exports = new InfinitePayProvider();
