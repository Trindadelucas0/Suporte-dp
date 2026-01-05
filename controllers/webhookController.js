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
          
          // 5.4. Verificar se é renovação (order tem user_id) ou novo pagamento
          const isRenovacao = order.user_id !== null && order.user_id !== undefined;
          
          // 5.5. Enviar notificação de pagamento confirmado para o administrador
          // IMPORTANTE: Só envia notificação para admin se NÃO for renovação
          // Renovações são feitas por usuários já cadastrados, não precisa notificar admin
          if (!isRenovacao) {
            const customerEmail = payload.customer_email || payload.email || order.customer_email || null;
            const customerName = payload.customer_name || existingUser?.nome || customerEmail?.split('@')[0] || 'Cliente';
            const valorReais = parseFloat(paid_amount) / 100;
            const dataPagamento = paid_at ? new Date(paid_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
            
            // Envia notificação para admin apenas para novos pagamentos (não renovações)
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
                  console.log('✅ [WEBHOOK] Notificação de pagamento enviada para admin (NOVO PAGAMENTO):', {
                    admin_email: process.env.ADMIN_EMAIL || 'lucasrodrigues4@live.com',
                    cliente_nome: customerName,
                    cliente_email: customerEmail || existingUser?.email
                  });
                } catch (notifError) {
                  console.error('⚠️ [WEBHOOK] Erro ao enviar notificação de pagamento para admin (não crítico):', notifError);
                }
              });
            }
          } else {
            console.log('ℹ️ [WEBHOOK] Renovação detectada - não enviando notificação para admin:', {
              user_id: order.user_id,
              order_nsu: order_nsu,
              nota: 'Renovações não geram notificação para admin'
            });
          }

          // 5.6. NOVO FLUXO: SEMPRE gerar token e enviar email quando pagamento for confirmado
          // O acesso só é liberado após validação do token
          
          // IMPORTANTE: Para renovações, usa o email do usuário logado (order.user_id)
          // Para novos pagamentos, usa o email do payload ou order
          let emailParaToken = null;
          
          if (isRenovacao && existingUser) {
            // RENOVAÇÃO: Usa email do usuário logado
            emailParaToken = existingUser.email;
            console.log('🔄 [WEBHOOK] RENOVAÇÃO detectada - usando email do usuário logado:', {
              user_id: existingUser.id,
              email: emailParaToken,
              order_nsu: order_nsu,
              nota: 'Token será vinculado ao email do usuário logado'
            });
          } else {
            // NOVO PAGAMENTO: Usa email do payload ou order
            emailParaToken = payload.customer_email || payload.email || order.customer_email || null;
            console.log('🆕 [WEBHOOK] NOVO PAGAMENTO - usando email do payload/order:', {
              email: emailParaToken,
              order_nsu: order_nsu
            });
          }
          
          if (emailParaToken) {
            try {
              // Atualizar user_id no pagamento se usuário já existe (para referência)
              if (existingUser) {
                await client.query(
                  'UPDATE payments SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                  [existingUser.id, payment.id]
                );
                
                if (isRenovacao) {
                  console.log('🔄 PAGAMENTO CONFIRMADO (RENOVAÇÃO): Usuário logado, token será vinculado ao email do login:', {
                    user_id: existingUser.id,
                    email: existingUser.email,
                    order_nsu: order_nsu
                  });
                } else {
                  console.log('🔄 PAGAMENTO CONFIRMADO: Usuário já existe, mas acesso aguarda validação do token:', {
                    user_id: existingUser.id,
                    order_nsu: order_nsu
                  });
                }
              } else {
                console.log('🆕 PAGAMENTO CONFIRMADO: Primeiro pagamento, gerando token de validação:', {
                  order_nsu: order_nsu
                });
              }
              
                // IMPORTANTE: Cada pagamento (order_nsu) deve ter seu próprio token
                // Verifica se já existe QUALQUER token para ESTE pagamento específico (mesmo usado ou expirado)
                // Token só deve ser gerado UMA VEZ por pagamento, não sempre que o webhook é chamado
                const tokensExistentes = await PaymentToken.findByOrderNsu(order_nsu);
                
                if (tokensExistentes && tokensExistentes.length > 0) {
                  // Já existe token para ESTE pagamento específico - não gera novo
                  // Independente de estar usado ou expirado, cada pagamento tem apenas UM token
                  const tokenExistente = tokensExistentes[0]; // Pega o mais recente
                  console.log('ℹ️ [WEBHOOK] Já existe token para este pagamento, não gerando novo token:', {
                    order_nsu: order_nsu,
                    token_existente: tokenExistente.token,
                    email: emailParaToken,
                    token_usado: tokenExistente.used,
                    token_expirado: new Date(tokenExistente.expires_at) < new Date(),
                    created_at: tokenExistente.created_at,
                    expires_at: tokenExistente.expires_at,
                    nota: 'Cada pagamento tem apenas UM token - este pagamento já tem token (mesmo que usado/expirado)'
                  });
                  // Não gera novo token - já existe um para este pagamento específico
                  // Não faz return aqui para não sair da transação - apenas não gera token
                } else {
                  // Não há token válido para ESTE pagamento - gera novo token e envia email
                  // Para renovações: token vinculado ao email do usuário logado
                  // Para novos pagamentos: token vinculado ao email do payload/order
                console.log('🔄 [WEBHOOK] Gerando novo token para este pagamento:', {
                  order_nsu: order_nsu,
                  email: emailParaToken,
                  tipo: isRenovacao ? 'RENOVAÇÃO' : 'NOVO PAGAMENTO',
                  user_id: existingUser ? existingUser.id : null,
                  tokens_existentes_total: tokensExistentes.length,
                  tokens_existentes_usados: tokensExistentes.filter(t => t.used).length,
                  nota: isRenovacao 
                    ? 'Renovação: token vinculado ao email do usuário logado' 
                    : 'Novo pagamento: token vinculado ao email do payload/order'
                });
                
                // Gera novo token para este pagamento específico
                // IMPORTANTE: Para renovações, usa email do usuário logado
                // Usa createWithClient para garantir que a verificação de pagamento seja feita dentro da transação
                const paymentToken = await PaymentToken.createWithClient(
                  order_nsu,
                  emailParaToken, // Email do usuário logado (renovação) ou do payload (novo pagamento)
                  existingUser ? existingUser.id : null, // user_id se usuário já existe
                  client // client da transação
                );
                
                console.log('✅ Token de pagamento gerado:', {
                  token: paymentToken.token,
                  email: emailParaToken,
                  order_nsu: order_nsu,
                  user_id: existingUser ? existingUser.id : null,
                  tipo: isRenovacao ? 'RENOVAÇÃO' : 'NOVO PAGAMENTO',
                  nota: isRenovacao 
                    ? 'Token vinculado ao email do usuário logado - usuário valida e acessa por 30 dias' 
                    : 'Token vinculado ao email do pagamento - aguarda validação'
                });
                
                // Converter valor de centavos para reais (paid_amount vem em centavos)
                const valorReais = parseFloat(paid_amount) / 100;
                
                // IMPORTANTE: Sempre envia email quando gera novo token
                // Para renovações: envia para o email do usuário logado
                // Para novos pagamentos: envia para o email do payload/order
                const nomeCliente = isRenovacao 
                  ? (existingUser?.nome || 'Cliente')
                  : (payload.customer_name || order.customer_email?.split('@')[0] || 'Cliente');
                
                console.log('📧 [WEBHOOK] Enviando email com token:', {
                  email: emailParaToken,
                  nome: nomeCliente,
                  tipo: isRenovacao ? 'RENOVAÇÃO' : 'NOVO PAGAMENTO',
                  token: paymentToken.token.substring(0, 8) + '...',
                  order_nsu: order_nsu
                });
                
                emailService.sendPaymentToken({
                  email: emailParaToken,
                  token: paymentToken.token,
                  nome: nomeCliente,
                  orderNsu: order_nsu,
                  valor: valorReais
                }).then(result => {
                  if (result.success) {
                    console.log('✅ [WEBHOOK] Email com token enviado com sucesso:', {
                      email: emailParaToken,
                      tipo: isRenovacao ? 'RENOVAÇÃO' : 'NOVO PAGAMENTO',
                      message_id: result.messageId
                    });
                    console.log('🔗 [WEBHOOK] Token vinculado ao email:', {
                      email: emailParaToken,
                      token: paymentToken.token,
                      order_nsu: order_nsu,
                      nota: isRenovacao 
                        ? 'Renovação: usuário valida token e acessa por 30 dias' 
                        : 'Novo pagamento: aguarda validação do token'
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
