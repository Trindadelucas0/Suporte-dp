/**
 * SERVICE: InfinitePayService
 * Integração com API InfinitePay
 * Documentação: https://api.infinitepay.io/
 */

const axios = require('axios');
require('dotenv').config();

class InfinitePayService {
  // Handle da conta InfinitePay
  static HANDLE = process.env.INFINITEPAY_HANDLE || 'lucas-rodrigues-740';
  
  // URL base da API
  static API_BASE_URL = 'https://api.infinitepay.io';
  
  // URL do app (para redirect_url e webhook_url)
  static APP_URL = process.env.APP_URL || 'https://departamento-pessoal.onrender.com';

  /**
   * Cria link de checkout na InfinitePay
   * @param {Object} dados - Dados do checkout
   * @param {String} dados.orderNsu - UUID do pedido interno
   * @param {Number} dados.valor - Valor do pedido
   * @param {String} dados.descricao - Descrição do produto
   * @returns {Object} Resposta da API InfinitePay
   */
  static async criarLinkCheckout(dados) {
    const { orderNsu, valor, descricao = 'Assinatura Suporte DP' } = dados;

    try {
      // Garante que valor é um número (em reais)
      const valorNumerico = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
      
      // Valida valor mínimo (deve ser maior que 1 centavo = R$ 0,01)
      if (isNaN(valorNumerico) || valorNumerico <= 0.01) {
        throw new Error(`Valor inválido: ${valor}. Deve ser maior que R$ 0,01.`);
      }

      // Converte reais para centavos (API InfinitePay espera valores em centavos)
      // Ex: R$ 19,90 = 1990 centavos
      const valorEmCentavos = Math.round(valorNumerico * 100);

      const payload = {
        handle: this.HANDLE,
        items: [
          {
            quantity: 1,
            price: valorEmCentavos, // Valor em centavos (ex: 1990 para R$ 19,90)
            description: descricao
          }
        ],
        order_nsu: orderNsu,
        redirect_url: `${this.APP_URL}/register?order_nsu=${orderNsu}`,
        webhook_url: `${this.APP_URL}/webhook/infinitepay`
      };

      console.log('InfinitePay - Criando link de checkout:', {
        handle: this.HANDLE,
        order_nsu: orderNsu,
        valor_reais: valorNumerico,
        valor_centavos: valorEmCentavos,
        items: payload.items,
        redirect_url: payload.redirect_url,
        webhook_url: payload.webhook_url
      });

      const response = await axios.post(
        `${this.API_BASE_URL}/invoices/public/checkout/links`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos
        }
      );

      console.log('InfinitePay - Link criado com sucesso:', {
        invoice_slug: response.data?.invoice_slug,
        checkout_url: response.data?.checkout_url ? 'sim' : 'não'
      });

      return {
        success: true,
        data: {
          checkout_url: response.data.checkout_url,
          invoice_slug: response.data.invoice_slug,
          order_nsu: response.data.order_nsu
        }
      };
    } catch (error) {
      console.error('InfinitePay - Erro ao criar link de checkout:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        errors: error.response?.data?.errors
      });

      // Log detalhado dos erros da API
      if (error.response?.data?.errors) {
        console.error('InfinitePay - Detalhes dos erros:', JSON.stringify(error.response.data.errors, null, 2));
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Valida webhook da InfinitePay
   * @param {Object} payload - Payload do webhook
   * @returns {Boolean} Se o webhook é válido
   */
  static validarWebhook(payload) {
    // Validações básicas
    if (!payload.order_nsu) {
      console.error('InfinitePay - Webhook inválido: order_nsu não encontrado');
      return false;
    }

    if (!payload.transaction_nsu) {
      console.error('InfinitePay - Webhook inválido: transaction_nsu não encontrado');
      return false;
    }

    if (!payload.invoice_slug) {
      console.error('InfinitePay - Webhook inválido: invoice_slug não encontrado');
      return false;
    }

    if (payload.status !== 'paid') {
      console.log('InfinitePay - Webhook com status diferente de paid:', payload.status);
      // Não é erro, mas só processamos status 'paid'
      return false;
    }

    return true;
  }
}

module.exports = InfinitePayService;

