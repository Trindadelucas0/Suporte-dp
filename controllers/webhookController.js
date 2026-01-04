/**
 * CONTROLLER: WebhookController
 * Processa webhooks da InfinitePay
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const InfinitePayService = require('../services/infinitepayService');

class WebhookController {
  /**
   * Processa webhook da InfinitePay
   * POST /webhook/infinitepay
   */
  static async infinitepay(req, res) {
    // Responde rápido (antes de processar tudo)
    res.status(200).send('OK');

    // Processa assincronamente
    setImmediate(async () => {
      try {
        const payload = req.body;
        console.log('Webhook InfinitePay recebido:', {
          order_nsu: payload.order_nsu,
          transaction_nsu: payload.transaction_nsu,
          status: payload.status
        });

        // 1. Validar webhook
        if (!InfinitePayService.validarWebhook(payload)) {
          console.error('Webhook InfinitePay inválido:', payload);
          return;
        }

        const {
          order_nsu,
          transaction_nsu,
          invoice_slug,
          amount,
          paid_amount,
          capture_method,
          receipt_url,
          status,
          paid_at
        } = payload;

        // 2. Verificar se order_nsu existe
        const order = await Order.findByOrderNsu(order_nsu);
        if (!order) {
          console.error('Webhook InfinitePay - Pedido não encontrado:', order_nsu);
          return;
        }

        // 3. Verificar se já foi processado (evitar duplicação)
        const existingPayment = await Payment.findByTransactionNsu(transaction_nsu);
        if (existingPayment) {
          console.log('Webhook InfinitePay - Pagamento já processado:', transaction_nsu);
          return;
        }

        // 4. Calcular next_billing_date (30 dias após pagamento)
        const paidDate = new Date(paid_at);
        const nextBillingDate = new Date(paidDate);
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        // 5. Salvar pagamento no banco
        const payment = await Payment.create({
          order_nsu: order_nsu,
          user_id: null, // Será atualizado quando usuário se cadastrar
          transaction_nsu: transaction_nsu,
          invoice_slug: invoice_slug,
          amount: parseFloat(amount),
          paid_amount: parseFloat(paid_amount),
          capture_method: capture_method,
          receipt_url: receipt_url,
          status: status,
          paid_at: paid_at,
          next_billing_date: nextBillingDate.toISOString().split('T')[0] // Formato DATE
        });

        console.log('Pagamento salvo:', {
          id: payment.id,
          order_nsu: payment.order_nsu,
          transaction_nsu: payment.transaction_nsu
        });

        // 6. Atualizar status do pedido para "paid"
        await Order.updateStatus(order_nsu, 'paid');

        // 7. Verificar se já existe usuário para esse order_nsu
        // Se existe, atualizar assinatura automaticamente
        const existingUser = await User.findByOrderNsu(order_nsu);
        if (existingUser) {
          console.log('Usuário já existe, atualizando assinatura:', existingUser.id);
          
          // Atualizar user_id no pagamento
          await Payment.updateUserIdByOrderNsu(order_nsu, existingUser.id);

          // Atualizar assinatura do usuário
          await User.updateSubscription(existingUser.id, {
            status: 'ativo',
            subscription_status: 'ativa',
            subscription_expires_at: nextBillingDate.toISOString().split('T')[0]
          });

          console.log('Assinatura atualizada automaticamente:', {
            user_id: existingUser.id,
            subscription_expires_at: nextBillingDate.toISOString().split('T')[0]
          });
        } else {
          console.log('Usuário ainda não existe, aguardando cadastro');
        }

        console.log('Webhook InfinitePay processado com sucesso');
      } catch (error) {
        console.error('Erro ao processar webhook InfinitePay:', error);
        console.error('Stack:', error.stack);
      }
    });
  }
}

module.exports = WebhookController;
