/**
 * CONTROLLER: WebhookController
 * Processa webhooks da InfinitePay
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const PaymentToken = require('../models/PaymentToken');
const InfinitePayService = require('../services/infinitepayService');
const db = require('../config/database');
const emailService = require('../services/emailService');

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

        // 1. Validar webhook (inclui validação de origem se configurado)
        if (!InfinitePayService.validarWebhook(payload, req.headers)) {
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
        // Se paid_at não vier no payload, usa data/hora atual
        const paidDate = paid_at ? new Date(paid_at) : new Date();
        const nextBillingDate = new Date(paidDate);
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        // 5. Processar em transação SQL para garantir atomicidade
        await db.transaction(async (client) => {
          // 5.1. Salvar pagamento no banco
          const paymentResult = await client.query(
            `INSERT INTO payments (
              order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
              capture_method, receipt_url, status, paid_at, next_billing_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, order_nsu, user_id, transaction_nsu, invoice_slug, amount, paid_amount,
                      capture_method, receipt_url, status, paid_at, next_billing_date, created_at`,
            [
              order_nsu,
              order.user_id || null, // Usa user_id do order se for renovação, senão null (aguarda cadastro)
              transaction_nsu,
              invoice_slug,
              parseFloat(amount),
              parseFloat(paid_amount),
              capture_method,
              receipt_url,
              status || 'paid', // Se não tem status no payload, assume 'paid'
              paid_at || paidDate.toISOString(), // Se não tem paid_at, usa data atual
              nextBillingDate.toISOString().split('T')[0] // Formato DATE
            ]
          );
          
          const payment = paymentResult.rows[0];
          console.log('Pagamento salvo:', {
            id: payment.id,
            order_nsu: payment.order_nsu,
            transaction_nsu: payment.transaction_nsu
          });

          // 5.2. Atualizar status do pedido para "paid"
          await client.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_nsu = $2',
            ['paid', order_nsu]
          );

          // 5.3. Verificar se já existe usuário para esse order_nsu (dentro da transação)
          // SOLUÇÃO MELHORADA: Busca user_id diretamente do order (se for renovação ou checkout após cadastro)
          let existingUser = null;
          
          // Se order tem user_id, buscar usuário diretamente (renovação ou checkout após cadastro)
          if (order.user_id) {
            const userResult = await client.query(
              'SELECT id, nome, email, is_admin, order_nsu, subscription_status, subscription_expires_at FROM users WHERE id = $1',
              [order.user_id]
            );
            existingUser = userResult.rows[0] || null;
            
            if (existingUser) {
              console.log('✅ Usuário encontrado pelo user_id do order:', existingUser.id);
            }
          }
          
          // Se não encontrou pelo user_id, tenta buscar pelo email do order (se disponível)
          if (!existingUser && order.customer_email) {
            const userResult = await client.query(
              'SELECT id, nome, email, is_admin, order_nsu, subscription_status, subscription_expires_at FROM users WHERE email = $1',
              [order.customer_email]
            );
            existingUser = userResult.rows[0] || null;
            
            if (existingUser) {
              console.log('✅ Usuário encontrado pelo email do order:', existingUser.id);
            }
          }
          
          // Se ainda não encontrou, tenta buscar pelo email do payload do webhook
          if (!existingUser) {
            const customerEmail = payload.customer_email || payload.email || null;
            if (customerEmail) {
              const userResult = await client.query(
                'SELECT id, nome, email, is_admin, order_nsu, subscription_status, subscription_expires_at FROM users WHERE email = $1',
                [customerEmail]
              );
              existingUser = userResult.rows[0] || null;
              
              if (existingUser) {
                console.log('✅ Usuário encontrado pelo email do webhook:', existingUser.id);
              }
            }
          }
          
          // Se ainda não encontrou, tenta buscar pelo order_nsu do usuário (fallback antigo)
          if (!existingUser) {
            const userResult = await client.query(
              'SELECT id, nome, email, is_admin, order_nsu, subscription_status, subscription_expires_at FROM users WHERE order_nsu = $1',
              [order_nsu]
            );
            existingUser = userResult.rows[0] || null;
            
            if (existingUser) {
              console.log('✅ Usuário encontrado pelo order_nsu (fallback):', existingUser.id);
            }
          }
          
          if (existingUser) {
            // RENOVAÇÃO - usuário já existe
            console.log('🔄 RENOVAÇÃO: Usuário já existe, atualizando assinatura:', {
              user_id: existingUser.id,
              order_nsu: order_nsu
            });
            
            // 5.3.1. Atualizar user_id no pagamento
            await client.query(
              'UPDATE payments SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [existingUser.id, payment.id]
            );

            // 5.3.2. Atualizar assinatura do usuário
            await client.query(
              `UPDATE users 
               SET status = $1, subscription_status = $2, subscription_expires_at = $3, updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [
                'ativo',
                'ativa',
                nextBillingDate.toISOString().split('T')[0],
                existingUser.id
              ]
            );

            console.log('✅ RENOVAÇÃO: Assinatura atualizada automaticamente:', {
              user_id: existingUser.id,
              subscription_expires_at: nextBillingDate.toISOString().split('T')[0]
            });
          } else {
            // PRIMEIRO PAGAMENTO - aguarda cadastro
            console.log('🆕 PRIMEIRO PAGAMENTO: Usuário ainda não existe, aguardando cadastro');
            
            // 5.3.3. Enviar email de confirmação (se SMTP configurado)
            // Nota: Não temos email ainda (será coletado no cadastro)
            // Mas podemos tentar buscar do payload se disponível
            const customerEmail = payload.customer_email || payload.email || null;
            
            if (customerEmail) {
              const appUrl = process.env.APP_URL || 'http://localhost:3000';
              const linkCadastro = `${appUrl}/register?order_nsu=${order_nsu}`;
              
              emailService.sendPaymentConfirmation({
                email: customerEmail,
                nome: payload.customer_name || 'Cliente',
                orderNsu: order_nsu,
                valor: paid_amount,
                linkCadastro: linkCadastro
              }).catch(emailError => {
                console.error('Erro ao enviar email de confirmação (não crítico):', emailError);
              });
            } else {
              console.log('⚠️ Email do cliente não disponível no webhook. Email será enviado após cadastro.');
            }
          }
        });

        console.log('✅ Webhook InfinitePay processado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao processar webhook InfinitePay:', error);
        console.error('Stack:', error.stack);
        // Erro será rollback automático pela transação
      }
    });
  }
}

module.exports = WebhookController;
