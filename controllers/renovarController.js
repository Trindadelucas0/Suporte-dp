/**
 * CONTROLLER: RenovarController
 * Gerencia o processo de renovação de assinatura
 */

const Order = require('../models/Order');
const User = require('../models/User');
const Payment = require('../models/Payment');
const InfinitePayService = require('../services/infinitepayService');

class RenovarController {
  /**
   * Exibe página de renovação e processa criação de pedido
   * GET /renovar - mostra página
   * POST /renovar - cria pedido e redireciona para pagamento
   */
  static async index(req, res) {
    // Requer autenticação (mesmo com assinatura expirada)
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

        return res.render('renovar', {
          title: 'Renovar Assinatura - Suporte DP',
          user: user,
          error: null,
          checkoutUrl: null,
          orderNsu: null
        });
      } catch (error) {
        console.error('Erro ao carregar página de renovação:', error);
        return res.render('renovar', {
          title: 'Renovar Assinatura - Suporte DP',
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

      // VALIDAÇÃO: Verifica se pode renovar (só permite após 30 dias ou se assinatura expirou)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      let dataExpiracao = null;
      if (user.subscription_expires_at) {
        dataExpiracao = new Date(user.subscription_expires_at);
        dataExpiracao.setHours(0, 0, 0, 0);
      }
      
      const assinaturaExpirada = dataExpiracao && dataExpiracao < hoje;
      
      // Se assinatura ainda está ativa (não expirou), verifica último pagamento
      if (!assinaturaExpirada && user.subscription_status === 'ativa') {
        // Busca último pagamento do usuário
        const pagamentos = await Payment.findByUserId(userId);
        if (pagamentos && pagamentos.length > 0) {
          // Pega o pagamento mais recente
          const ultimoPagamento = pagamentos[0];
          
          if (ultimoPagamento.paid_at) {
            const dataUltimoPagamento = new Date(ultimoPagamento.paid_at);
            dataUltimoPagamento.setHours(0, 0, 0, 0);
            
            // Calcula diferença em dias
            const diffTime = hoje - dataUltimoPagamento;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Se ainda não se passaram 30 dias, bloqueia renovação
            if (diffDays < 30) {
              const diasRestantes = 30 - diffDays;
              console.log('⚠️ Tentativa de renovação antes dos 30 dias:', {
                user_id: userId,
                dias_desde_ultimo_pagamento: diffDays,
                dias_restantes: diasRestantes,
                data_ultimo_pagamento: ultimoPagamento.paid_at
              });
              
              return res.render('renovar', {
                title: 'Renovar Assinatura - Suporte DP',
                user: user,
                error: `Você só pode renovar sua assinatura após 30 dias do último pagamento. Ainda faltam ${diasRestantes} dia(s) para poder renovar. Sua assinatura está ativa até ${dataExpiracao ? dataExpiracao.toLocaleDateString('pt-BR') : 'N/A'}.`,
                checkoutUrl: null,
                orderNsu: null
              });
            }
          }
        }
      }
      
      // Se chegou aqui, pode renovar (assinatura expirada OU já se passaram 30 dias)

      // 1. Criar pedido interno no banco (novo order_nsu para renovação)
      const order = await Order.create(valor);
      console.log('Pedido de renovação criado:', {
        id: order.id,
        order_nsu: order.order_nsu,
        status: order.status,
        valor: order.valor,
        user_id: userId
      });

      // 2. Chamar API InfinitePay para criar link de checkout
      // Para renovação: redirect_url aponta para /login?renovado=true
      const infinitepayResponse = await InfinitePayService.criarLinkCheckoutRenovacao({
        orderNsu: order.order_nsu,
        valor: valor,
        descricao: 'Renovação - suporte-dp',
        userId: userId
      });

      if (!infinitepayResponse.success) {
        console.error('Erro ao criar link InfinitePay (renovação):', infinitepayResponse.error);
        await Order.updateStatus(order.order_nsu, 'cancelled');
        return res.render('renovar', {
          title: 'Renovar Assinatura - Suporte DP',
          user: user,
          error: 'Erro ao criar link de pagamento. Tente novamente.',
          checkoutUrl: null,
          orderNsu: null
        });
      }

      // 3. Verificar se checkout_url existe antes de continuar
      if (!infinitepayResponse.data || !infinitepayResponse.data.checkout_url) {
        console.error('Erro: checkout_url não retornado pela API InfinitePay (renovação)', {
          response: infinitepayResponse,
          data: infinitepayResponse.data
        });
        return res.render('renovar', {
          title: 'Renovar Assinatura - Suporte DP',
          user: user,
          error: 'Erro ao gerar link de pagamento. Tente novamente.',
          checkoutUrl: null,
          orderNsu: null
        });
      }

      console.log('Link de checkout de renovação criado com sucesso:', {
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
      console.log('✅ Link de pagamento de renovação gerado:', checkoutUrl);

      return res.render('renovar', {
        title: 'Renovar Assinatura - Suporte DP',
        user: user,
        error: null,
        checkoutUrl: checkoutUrl,
        orderNsu: order.order_nsu
      });
    } catch (error) {
      console.error('Erro no processo de renovação:', error);
      console.error('Stack:', error.stack);
      
      try {
        const user = await User.findById(userId);
        return res.render('renovar', {
          title: 'Renovar Assinatura - Suporte DP',
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

module.exports = RenovarController;

