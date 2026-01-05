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
    // Log inicial para debug
    console.log('🔔 [WEBHOOK] Requisição recebida:', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      },
      body_keys: Object.keys(req.body || {})
    });

    // Responde rápido (antes de processar tudo)
    res.status(200).send('OK');

    // Processa assincronamente
    setImmediate(async () => {
      try {
        const payload = req.body;
        console.log('📥 [WEBHOOK] Webhook InfinitePay recebido:', {
          order_nsu: payload.order_nsu,
          transaction_nsu: payload.transaction_nsu,
          status: payload.status,
          customer_email: payload.customer_email || payload.email,
          paid_amount: payload.paid_amount,
          timestamp: new Date().toISOString()
        });

        // 1. Validar webhook (inclui validação de origem se configurado)
        const isValid = InfinitePayService.validarWebhook(payload, req.headers);
        console.log('🔍 [WEBHOOK] Validação do webhook:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
        
        if (!isValid) {
          console.error('❌ [WEBHOOK] Webhook InfinitePay inválido:', {
            payload: payload,
            headers: req.headers
          });
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
        console.log('🔍 [WEBHOOK] Busca do order:', {
          order_nsu: order_nsu,
          encontrado: order ? '✅ SIM' : '❌ NÃO',
          order_user_id: order?.user_id || 'N/A',
          order_customer_email: order?.customer_email || 'N/A',
          order_status: order?.status || 'N/A'
        });
        
        if (!order) {
          console.error('❌ [WEBHOOK] Webhook InfinitePay - Pedido não encontrado:', order_nsu);
          console.error('💡 [WEBHOOK] Verifique se o order_nsu está correto e se o pedido foi criado antes do pagamento');
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

          // 5.4. Verificar se já existe usuário para esse order_nsu (dentro da transação)
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
          
          // 5.4. Enviar notificação de pagamento confirmado para o administrador
          const customerEmail = payload.customer_email || payload.email || order.customer_email || null;
          const customerName = payload.customer_name || existingUser?.nome || customerEmail?.split('@')[0] || 'Cliente';
          const valorReais = parseFloat(paid_amount) / 100;
          const dataPagamento = paid_at ? new Date(paid_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
          
          // Envia notificação para admin (assíncrono, não bloqueia)
          if (customerEmail || existingUser) {
            setImmediate(async () => {
              try {
                await emailService.sendPaymentNotificationToAdmin({
                  nome: customerName,
                  email: customerEmail || existingUser?.email || 'Não informado',
                  orderNsu: order_nsu,
                  transactionNsu: transaction_nsu,
                  valor: valorReais,
                  dataPagamento: dataPagamento
                });
                console.log('✅ [WEBHOOK] Notificação de pagamento enviada para admin:', {
                  admin_email: process.env.ADMIN_EMAIL || 'lucasrodrigues4@live.com',
                  cliente_nome: customerName,
                  cliente_email: customerEmail || existingUser?.email
                });
              } catch (notifError) {
                console.error('⚠️ [WEBHOOK] Erro ao enviar notificação de pagamento para admin (não crítico):', notifError);
              }
            });
          }

          // 5.5. NOVO FLUXO: SEMPRE gerar token e enviar email quando pagamento for confirmado
          // O acesso só é liberado após validação do token
          if (customerEmail) {
            try {
              // Atualizar user_id no pagamento se usuário já existe (para referência)
              if (existingUser) {
                await client.query(
                  'UPDATE payments SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                  [existingUser.id, payment.id]
                );
                
                console.log('🔄 PAGAMENTO CONFIRMADO: Usuário já existe, mas acesso aguarda validação do token:', {
                  user_id: existingUser.id,
                  order_nsu: order_nsu
                });
              } else {
                console.log('🆕 PAGAMENTO CONFIRMADO: Primeiro pagamento, gerando token de validação:', {
                  order_nsu: order_nsu
                });
              }
              
              // IMPORTANTE: Cada pagamento (order_nsu) deve ter seu próprio token
              // Verifica se já existe token válido (não usado, não expirado) para ESTE pagamento específico
              const tokensExistentes = await PaymentToken.findByOrderNsu(order_nsu);
              const now = new Date();
              const tokenValidoExistente = tokensExistentes.find(t => {
                if (t.used) return false; // Token já foi usado
                const expiresAt = new Date(t.expires_at);
                return expiresAt > now; // Token não expirou
              });
              
              if (tokenValidoExistente) {
                // Já existe token válido para ESTE pagamento específico - não gera novo
                console.log('ℹ️ [WEBHOOK] Já existe token válido para este pagamento, não gerando novo token:', {
                  order_nsu: order_nsu,
                  token_existente: tokenValidoExistente.token,
                  email: customerEmail,
                  created_at: tokenValidoExistente.created_at,
                  expires_at: tokenValidoExistente.expires_at,
                  nota: 'Cada pagamento tem seu próprio token - este pagamento já tem token válido'
                });
                // Não gera novo token - já existe um válido para este pagamento específico
                // Não faz return aqui para não sair da transação - apenas não gera token
              } else {
                // Não há token válido para ESTE pagamento - gera novo token e envia email
                // Isso permite que cada novo pagamento (renovação) gere seu próprio token
                console.log('🔄 [WEBHOOK] Gerando novo token para este pagamento:', {
                  order_nsu: order_nsu,
                  email: customerEmail,
                  tipo: existingUser ? 'RENOVAÇÃO' : 'NOVO PAGAMENTO',
                  user_id: existingUser ? existingUser.id : null,
                  tokens_existentes_total: tokensExistentes.length,
                  tokens_existentes_usados: tokensExistentes.filter(t => t.used).length,
                  nota: 'Cada pagamento gera seu próprio token e envia email'
                });
                // Gera novo token para este pagamento específico
                // Usa createWithClient para garantir que a verificação de pagamento seja feita dentro da transação
                const paymentToken = await PaymentToken.createWithClient(
                  order_nsu,
                  customerEmail,
                  existingUser ? existingUser.id : null, // user_id se usuário já existe
                  client // client da transação
                );
                
                console.log('✅ Token de pagamento gerado:', {
                  token: paymentToken.token,
                  email: customerEmail,
                  order_nsu: order_nsu,
                  user_id: existingUser ? existingUser.id : null,
                  tipo: existingUser ? 'RENOVAÇÃO' : 'NOVO PAGAMENTO'
                });
                
                // Converter valor de centavos para reais (paid_amount vem em centavos)
                const valorReais = parseFloat(paid_amount) / 100;
                
                // IMPORTANTE: Sempre envia email quando gera novo token
                // Cada pagamento gera seu próprio token e envia seu próprio email
                console.log('📧 [WEBHOOK] Enviando email com token para:', customerEmail);
                console.log('📧 [WEBHOOK] Token vinculado ao email:', {
                  email: customerEmail,
                  token: paymentToken.token,
                  order_nsu: order_nsu,
                  valor: valorReais
                });
                
                emailService.sendPaymentToken({
                  email: customerEmail,
                  token: paymentToken.token,
                  nome: payload.customer_name || order.customer_email || existingUser?.nome || 'Cliente',
                  orderNsu: order_nsu,
                  valor: valorReais
                }).then(result => {
                  if (result.success) {
                    console.log('✅ [WEBHOOK] Email com token enviado com sucesso:', customerEmail);
                    console.log('📬 [WEBHOOK] Message ID:', result.messageId);
                    console.log('🔗 [WEBHOOK] Token vinculado ao email:', {
                      email: customerEmail,
                      token: paymentToken.token,
                      order_nsu: order_nsu
                    });
                  } else {
                    console.error('❌ [WEBHOOK] Erro ao enviar email com token:', result.error);
                  }
                }).catch(emailError => {
                  console.error('❌ [WEBHOOK] Erro ao enviar email com token (não crítico):', emailError);
                  console.error('❌ [WEBHOOK] Stack do erro:', emailError.stack);
                });
              }
              
              // IMPORTANTE: NÃO atualizar assinatura aqui - aguarda validação do token
              // A validação do token é que vai liberar o acesso por 30 dias
              
            } catch (tokenError) {
              console.error('❌ Erro ao gerar token de pagamento:', tokenError);
            }
          } else {
            console.log('⚠️ Email do cliente não disponível no webhook. Não foi possível gerar token.');
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
