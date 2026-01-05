/**
 * CONTROLLER: CheckoutController
 * Gerencia o processo de checkout após cadastro
 */

const Order = require('../models/Order');
const User = require('../models/User');
const PaymentToken = require('../models/PaymentToken');
const InfinitePayService = require('../services/infinitepayService');
const db = require('../config/database');

class CheckoutController {
  /**
   * Rota de sucesso após pagamento
   * GET /checkout/sucesso - mostra página informando que precisa validar token
   */
  static async sucesso(req, res) {
    // Pega email da sessão (se logado) ou da query string
    let userEmail = null;
    
    if (req.session && req.session.user) {
      userEmail = req.session.user.email;
    } else if (req.query.email) {
      userEmail = req.query.email;
    }

    // Verifica se há token pendente (o webhook já deve ter gerado)
    if (userEmail) {
      const tokenPendente = await PaymentToken.findPendingTokenByEmail(userEmail);
      
      if (tokenPendente) {
        console.log('🔐 [CHECKOUT/SUCESSO] Token pendente encontrado, mostrando página de aguardo:', {
          email: userEmail
        });
      } else {
        console.log('⚠️ [CHECKOUT/SUCESSO] Nenhum token pendente encontrado ainda. Aguardando webhook...', {
          email: userEmail
        });
      }
    }

    // Mostra página informando que precisa validar token
    // NÃO redireciona para dashboard - usuário precisa validar token primeiro
    return res.render('checkout/aguardando-validacao', {
      title: 'Aguardando Validação - Suporte DP',
      email: userEmail
    });
  }

  /**
   * Exibe página de checkout e processa criação de pedido
   * GET /checkout - mostra página
   * POST /checkout - cria pedido e redireciona para pagamento
   */
  static async index(req, res) {
    // Requer autenticação
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }

    const userId = req.session.user.id;

      // GET - mostra página
      if (req.method === 'GET') {
        try {
          // Busca dados do usuário
          const user = await User.findById(userId);
          if (!user) {
            req.session.destroy();
            return res.redirect('/login');
          }

          // Verifica se já tem pagamento aprovado
          const Payment = require('../models/Payment');
          const payments = await Payment.findByUserId(userId);
          const hasPaidPayment = payments && payments.length > 0 && payments.some(p => p.status === 'paid');

          // Se já tem pagamento aprovado, redireciona para dashboard
          if (hasPaidPayment && user.subscription_status === 'ativa') {
            return res.redirect('/dashboard');
          }

          // Recupera mensagem de sucesso da sessão (se houver)
          let successMessage = null;
          if (req.session.successMessage) {
            successMessage = req.session.successMessage;
            delete req.session.successMessage;
            req.session.save();
          }

          return res.render('checkout', {
            title: 'Finalizar Pagamento - Suporte DP',
            user: user,
            error: null,
            successMessage: successMessage,
            checkoutUrl: null,
            orderNsu: null
          });
      } catch (error) {
        console.error('Erro ao carregar página de checkout:', error);
        return res.render('checkout', {
          title: 'Finalizar Pagamento - Suporte DP',
          user: null,
          error: 'Erro ao carregar dados. Tente novamente.',
          checkoutUrl: null,
          orderNsu: null
        });
      }
    }

    // POST - cria pedido e renderiza com link de pagamento
    try {
      const valor = 19.90; // Valor fixo do sistema

      // Verifica se usuário ainda existe
      const user = await User.findById(userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/login');
      }

      // Verifica se já tem pagamento aprovado pendente
      const Payment = require('../models/Payment');
      const payments = await Payment.findByUserId(userId);
      const hasPaidPayment = payments && payments.length > 0 && payments.some(p => p.status === 'paid');

      if (hasPaidPayment && user.subscription_status === 'ativa') {
        return res.redirect('/dashboard');
      }

      // 1. Criar pedido interno no banco (vinculado ao usuário e email)
      const order = await Order.create(valor, userId, user.email);
      
      console.log('Pedido de checkout criado:', {
        id: order.id,
        order_nsu: order.order_nsu,
        status: order.status,
        valor: order.valor,
        user_id: order.user_id,
        customer_email: user.email
      });

      // 2. Chamar API InfinitePay para criar link de checkout
      // Redirect para /checkout/sucesso após pagamento
      const infinitepayResponse = await InfinitePayService.criarLinkCheckout({
        orderNsu: order.order_nsu,
        valor: valor,
        descricao: 'suporte-dp',
        customerEmail: user.email
      });

      if (!infinitepayResponse.success) {
        console.error('Erro ao criar link InfinitePay (checkout):', infinitepayResponse.error);
        await Order.updateStatus(order.order_nsu, 'cancelled');
        return res.render('checkout', {
          title: 'Finalizar Pagamento - Suporte DP',
          user: user,
          error: 'Erro ao criar link de pagamento. Tente novamente.',
          checkoutUrl: null,
          orderNsu: null
        });
      }

      // 3. Verificar se checkout_url existe antes de continuar
      if (!infinitepayResponse.data || !infinitepayResponse.data.checkout_url) {
        console.error('Erro: checkout_url não retornado pela API InfinitePay (checkout)', {
          response: infinitepayResponse,
          data: infinitepayResponse.data
        });
        return res.render('checkout', {
          title: 'Finalizar Pagamento - Suporte DP',
          user: user,
          error: 'Erro ao gerar link de pagamento. Tente novamente.',
          checkoutUrl: null,
          orderNsu: null
        });
      }

      console.log('Link de checkout criado com sucesso:', {
        order_nsu: order.order_nsu,
        checkout_url: infinitepayResponse.data.checkout_url,
        user_id: userId
      });

      // 4. Atualizar pedido com checkout_url e invoice_slug (em paralelo)
      Order.updateCheckoutInfo(
        order.order_nsu,
        infinitepayResponse.data.checkout_url,
        infinitepayResponse.data.invoice_slug
      ).catch(updateError => {
        console.warn('Erro ao atualizar checkout info (não crítico):', updateError.message);
      });

      // 5. Renderizar página com botão para ir ao pagamento
      const checkoutUrl = infinitepayResponse.data.checkout_url;
      console.log('✅ Link de pagamento gerado:', checkoutUrl);

      return res.render('checkout', {
        title: 'Finalizar Pagamento - Suporte DP',
        user: user,
        error: null,
        checkoutUrl: checkoutUrl,
        orderNsu: order.order_nsu
      });
    } catch (error) {
      console.error('Erro no processo de checkout:', error);
      console.error('Stack:', error.stack);
      
      try {
        const user = await User.findById(userId);
        return res.render('checkout', {
          title: 'Finalizar Pagamento - Suporte DP',
          user: user || null,
          error: 'Erro ao processar solicitação. Tente novamente.',
          checkoutUrl: null,
          orderNsu: null
        });
      } catch (userError) {
        return res.redirect('/login');
      }
    }
  }
}

module.exports = CheckoutController;

