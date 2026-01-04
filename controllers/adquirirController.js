/**
 * CONTROLLER: AdquirirController
 * Gerencia o processo de aquisição do sistema
 */

const Order = require('../models/Order');
const InfinitePayService = require('../services/infinitepayService');

class AdquirirController {
  /**
   * Exibe página de aquisição e processa criação de pedido
   * GET /adquirir - mostra página
   * POST /adquirir - cria pedido e redireciona para pagamento
   */
  static async index(req, res) {
    // Se já está logado, redireciona para dashboard
    if (req.session.user) {
      return res.redirect('/dashboard');
    }

    // GET - mostra página
    if (req.method === 'GET') {
      return res.render('adquirir', {
        title: 'Adquirir Sistema - Suporte DP',
        error: null
      });
    }

    // POST - cria pedido e redireciona
    try {
      const valor = 19.90; // Valor fixo do sistema

      // 1. Criar pedido interno no banco
      const order = await Order.create(valor);
      console.log('Pedido criado:', {
        id: order.id,
        order_nsu: order.order_nsu,
        status: order.status,
        valor: order.valor
      });

      // 1.1. Salvar order_nsu na sessão como backup (caso URL se perca)
      if (req.session) {
        req.session.pendingOrderNsu = order.order_nsu;
        req.session.save();
      }

      // 2. Chamar API InfinitePay para criar link de checkout
      const infinitepayResponse = await InfinitePayService.criarLinkCheckout({
        orderNsu: order.order_nsu,
        valor: valor,
        descricao: 'suporte-dp'
      });

      if (!infinitepayResponse.success) {
        console.error('Erro ao criar link InfinitePay:', infinitepayResponse.error);
        
        // Atualiza status do pedido para erro (ou mantém pending)
        await Order.updateStatus(order.order_nsu, 'cancelled');

        return res.render('adquirir', {
          title: 'Adquirir Sistema - Suporte DP',
          error: 'Erro ao criar link de pagamento. Tente novamente.'
        });
      }

      // 3. Verificar se checkout_url existe antes de continuar
      if (!infinitepayResponse.data || !infinitepayResponse.data.checkout_url) {
        console.error('Erro: checkout_url não retornado pela API InfinitePay', {
          response: infinitepayResponse,
          data: infinitepayResponse.data
        });
        return res.render('adquirir', {
          title: 'Adquirir Sistema - Suporte DP',
          error: 'Erro ao gerar link de pagamento. Tente novamente.'
        });
      }

      console.log('Link de checkout criado com sucesso:', {
        order_nsu: order.order_nsu,
        checkout_url: infinitepayResponse.data.checkout_url
      });

      // 4. Atualizar pedido com checkout_url e invoice_slug (em paralelo, não bloqueia redirect)
      // O InfinitePay já retorna os dados, mas podemos salvar para referência
      Order.updateCheckoutInfo(
        order.order_nsu,
        infinitepayResponse.data.checkout_url,
        infinitepayResponse.data.invoice_slug
      ).catch(updateError => {
        console.warn('Erro ao atualizar checkout info (não crítico):', updateError.message);
      });

      // 5. Renderizar página com botão para ir ao pagamento (para testes)
      const checkoutUrl = infinitepayResponse.data.checkout_url;
      console.log('✅ Link de pagamento gerado:', checkoutUrl);
      
      return res.render('adquirir', {
        title: 'Adquirir Sistema - Suporte DP',
        error: null,
        checkoutUrl: checkoutUrl,
        orderNsu: order.order_nsu
      });
    } catch (error) {
      console.error('Erro no processo de aquisição:', error);
      return res.render('adquirir', {
        title: 'Adquirir Sistema - Suporte DP',
        error: 'Erro ao processar solicitação. Tente novamente.'
      });
    }
  }
}

module.exports = AdquirirController;

