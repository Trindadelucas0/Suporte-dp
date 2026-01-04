/**
 * CONTROLLER: WebhookController
 * Processa webhooks da InfinitePay
 */

const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
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
        const paidDate = new Date(paid_at);
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
              null, // Será atualizado quando usuário se cadastrar
              transaction_nsu,
              invoice_slug,
              parseFloat(amount),
              parseFloat(paid_amount),
              capture_method,
              receipt_url,
              status,
              paid_at,
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
          // Primeiro tenta buscar pelo order_nsu atual (funciona para primeiro pagamento)
          let userResult = await client.query(
            'SELECT id, nome, email, is_admin, order_nsu, subscription_status, subscription_expires_at FROM users WHERE order_nsu = $1',
            [order_nsu]
          );
          let existingUser = userResult.rows[0] || null;
          
          // Se não encontrou, pode ser renovação (novo order_nsu para usuário existente)
          // Na renovação, buscamos pelos pagamentos anteriores mais recentes
          // E verificamos se o order foi criado recentemente (últimos 15 minutos)
          if (!existingUser) {
            const orderCheckResult = await client.query(
              'SELECT created_at FROM orders WHERE order_nsu = $1 AND created_at > NOW() - INTERVAL \'15 minutes\'',
              [order_nsu]
            );
            
            // Se order foi criado recentemente, pode ser renovação
            if (orderCheckResult.rows.length > 0) {
              // Busca usuários que têm pagamentos anteriores (renovação)
              // Pega o usuário mais recente que tem pagamento pago
              const userFromPaymentResult = await client.query(
                `SELECT DISTINCT u.id, u.nome, u.email, u.is_admin, u.order_nsu, u.subscription_status, u.subscription_expires_at
                 FROM users u
                 INNER JOIN payments p ON p.user_id = u.id
                 WHERE p.status = 'paid' AND p.user_id IS NOT NULL
                 ORDER BY p.paid_at DESC
                 LIMIT 1`
              );
              
              // NOTA: Esta lógica é simplificada - na prática, renovação redireciona para /login
              // e o webhook atualiza quando usuário fizer login. Para maior precisão,
              // seria ideal passar user_id de outra forma, mas por segurança não colocamos na URL.
              // Esta busca é um fallback - normalmente renovação não chegaria aqui pois
              // o redirect é para /login, não para /register
              if (userFromPaymentResult.rows.length > 0) {
                existingUser = userFromPaymentResult.rows[0];
                console.log('🔄 RENOVAÇÃO detectada (fallback): encontrado usuário por pagamentos anteriores:', existingUser.id);
              }
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
