/**
 * CONTROLLER: AuthController
 * Gerencia autenticação e sessões
 */

const User = require('../models/User');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentToken = require('../models/PaymentToken');
const emailService = require('../services/emailService');
const db = require('../config/database');
const { validationResult } = require('express-validator');

class AuthController {
  static async login(req, res) {
    if (req.method === 'GET') {
      let error = null;
      let success = null;
      
      if (req.query.expired) {
        error = 'Sua sessão expirou por inatividade (10 minutos). Por favor, faça login novamente.';
      } else if (req.query.error === 'conta_bloqueada') {
        error = 'Sua conta está desativada ou bloqueada. Entre em contato com o administrador.';
      } else if (req.query.error === 'usuario_nao_encontrado') {
        error = 'Usuário não encontrado. Por favor, faça login novamente.';
      } else if (req.query.renovado === 'true') {
        success = 'Assinatura renovada com sucesso! Faça login para continuar usando o sistema.';
      } else if (req.query.msg === 'ja_cadastrado') {
        error = 'Você já possui uma conta cadastrada. Faça login com suas credenciais.';
      }
      
      return res.render('auth/login', {
        title: 'Login - Suporte DP',
        error: error,
        success: success
      });
    }

    const { email, senha } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Login - Suporte DP',
        error: 'Por favor, preencha todos os campos corretamente.',
        success: null
      });
    }

    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Email ou senha incorretos.',
        success: null
        });
      }

      const senhaValida = await User.verifyPassword(senha, user.senha_hash);
      
      if (!senhaValida) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Email ou senha incorretos.',
        success: null
        });
      }

      // Verifica se usuário está ativo e não bloqueado
      if (user.ativo === false || user.bloqueado === true) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Sua conta está desativada ou bloqueada. Entre em contato com o administrador.',
        success: null
        });
      }

      // VERIFICAÇÃO DE PAGAMENTO: Se tiver pago, permite login. Se não, bloqueia ou redireciona.
      // ADMIN: Sempre permite login (sem verificação de pagamento)
      if (!user.is_admin) {
        // CLIENTE: Verifica se tem pagamento ativo
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        let dataExpiracao = null;
        if (user.subscription_expires_at) {
          dataExpiracao = new Date(user.subscription_expires_at);
          dataExpiracao.setHours(0, 0, 0, 0);
        }

        const assinaturaExpirada = dataExpiracao && dataExpiracao < hoje;
        const assinaturaInadimplente = user.subscription_status === 'inadimplente';
        const assinaturaPendente = user.subscription_status === 'pendente';
        const semAssinatura = !user.subscription_expires_at || !user.subscription_status || user.subscription_status === null;
        const assinaturaAtiva = user.subscription_status === 'ativa' && dataExpiracao && dataExpiracao >= hoje;

        // Se assinatura está ATIVA, permite login normalmente (não precisa validar token novamente)
        if (assinaturaAtiva) {
          // Cria sessão e permite acesso
          req.session.user = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            is_admin: user.is_admin
          };
          req.session.lastActivity = Date.now();
          
          // Remove flag de validação de token se existir
          if (req.session.requireTokenValidation) {
            delete req.session.requireTokenValidation;
          }
          
          await User.updateLastLogin(user.id);
          
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao salvar sessão:', err);
              return res.render('auth/login', {
                title: 'Login - Suporte DP',
                error: 'Erro ao fazer login. Tente novamente.',
                success: null
              });
            }
            return res.redirect('/dashboard');
          });
          return;
        }

        // Se assinatura está pendente, permite login mas redireciona para checkout
        if (assinaturaPendente) {
          // Cria sessão primeiro
          req.session.user = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            is_admin: user.is_admin
          };
          req.session.lastActivity = Date.now();
          
          // Atualiza último login
          await User.updateLastLogin(user.id);
          
          // Salva sessão e redireciona para checkout
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao salvar sessão:', err);
              return res.render('auth/login', {
                title: 'Login - Suporte DP',
                error: 'Erro ao fazer login. Tente novamente.',
                success: null
              });
            }
            return res.redirect('/checkout');
          });
          return;
        }

        // NOVO: Se não tem assinatura ativa, verifica se há pagamento confirmado aguardando validação de token
        if (semAssinatura || assinaturaExpirada || assinaturaInadimplente) {
          // Verifica se há pagamento confirmado para este usuário (pode estar aguardando validação de token)
          // Busca por user_id e também por email (caso pagamento tenha sido feito antes do cadastro)
          const paymentsByUserId = await Payment.findByUserId(user.id);
          const paymentsByEmail = await db.query(
            `SELECT p.* FROM payments p
             INNER JOIN orders o ON p.order_nsu = o.order_nsu
             WHERE LOWER(o.customer_email) = LOWER($1) AND p.status = 'paid'`,
            [user.email]
          );
          const allPayments = [...paymentsByUserId, ...paymentsByEmail.rows];
          // Remove duplicatas baseado em order_nsu
          const uniquePayments = allPayments.reduce((acc, payment) => {
            if (!acc.find(p => p.order_nsu === payment.order_nsu)) {
              acc.push(payment);
            }
            return acc;
          }, []);
          const paidPayments = uniquePayments.filter(p => p.status === 'paid');
          const hasPaidPayment = paidPayments.length > 0;
          
          // Log de debug
          console.log('🔍 [LOGIN] Verificando pagamentos:', {
            user_id: user.id,
            email: user.email,
            payments_by_user_id: paymentsByUserId.length,
            payments_by_email: paymentsByEmail.rows.length,
            all_payments: allPayments.length,
            unique_payments: uniquePayments.length,
            paid_payments: paidPayments.length,
            has_paid_payment: hasPaidPayment
          });
          
          // Se há pagamento confirmado, verifica se há token pendente
          if (hasPaidPayment) {
            const tokenPendente = await PaymentToken.findPendingTokenByEmail(user.email);
            
            if (tokenPendente) {
              // Há token pendente - reenvia email com token e redireciona para validação
              console.log('🔐 [LOGIN] Token pendente encontrado. Reenviando email com token:', {
                user_id: user.id,
                email: user.email,
                token: tokenPendente.token,
                order_nsu: tokenPendente.order_nsu
              });
              
              // Busca o pagamento relacionado para obter o valor
              const paymentRelacionado = await Payment.findByOrderNsu(tokenPendente.order_nsu);
              const valorReais = paymentRelacionado ? parseFloat(paymentRelacionado.paid_amount || 1990) / 100 : 19.90;
              
              // Reenvia email com token (assíncrono, não bloqueia)
              setImmediate(async () => {
                try {
                  await emailService.sendPaymentToken({
                    email: user.email,
                    token: tokenPendente.token,
                    nome: user.nome,
                    orderNsu: tokenPendente.order_nsu,
                    valor: valorReais
                  });
                  console.log('✅ [LOGIN] Email com token reenviado com sucesso:', user.email);
                } catch (emailError) {
                  console.error('⚠️ [LOGIN] Erro ao reenviar email com token (não crítico):', emailError);
                }
              });
              
              // Cria sessão mas redireciona para validação de token
              req.session.user = {
                id: user.id,
                nome: user.nome,
                email: user.email,
                is_admin: user.is_admin
              };
              req.session.lastActivity = Date.now();
              req.session.requireTokenValidation = true;
              
              await User.updateLastLogin(user.id);
              
              req.session.save((err) => {
                if (err) {
                  console.error('Erro ao salvar sessão:', err);
                  return res.render('auth/login', {
                    title: 'Login - Suporte DP',
                    error: 'Erro ao fazer login. Tente novamente.',
                    success: null
                  });
                }
                return res.redirect(`/validar-pagamento?email=${encodeURIComponent(user.email)}&from=login`);
              });
              return;
            } else {
              // Há pagamento confirmado mas não há token pendente
              // Verifica se há algum pagamento que ainda não tem token gerado
              console.log('🔄 [LOGIN] Pagamento confirmado mas sem token pendente. Verificando se precisa gerar token...', {
                user_id: user.id,
                email: user.email
              });
              
              try {
                // Busca o order_nsu mais recente com pagamento confirmado
                const paymentMaisRecente = paidPayments.sort((a, b) => {
                  const dateA = new Date(a.paid_at || a.created_at || 0);
                  const dateB = new Date(b.paid_at || b.created_at || 0);
                  return dateB - dateA;
                })[0];
                
                if (paymentMaisRecente && paymentMaisRecente.order_nsu) {
                  // Verifica se já existe token válido para este pagamento
                  const tokensExistentes = await PaymentToken.findByOrderNsu(paymentMaisRecente.order_nsu);
                  const tokenValidoExistente = tokensExistentes.find(t => {
                    const now = new Date();
                    const expiresAt = new Date(t.expires_at);
                    return !t.used && expiresAt > now;
                  });
                  
                  if (tokenValidoExistente) {
                    console.log('ℹ️ [LOGIN] Já existe token válido para este pagamento, não gerando novo:', {
                      order_nsu: paymentMaisRecente.order_nsu,
                      token_existente: tokenValidoExistente.token
                    });
                    // Não gera novo token - redireciona informando que precisa fazer novo pagamento
                    return res.render('auth/login', {
                      title: 'Login - Suporte DP',
                      error: 'Seu token de validação já foi usado ou expirou. Para receber um novo token, é necessário fazer um novo pagamento.',
                      success: null
                    });
                  } else {
                    // Não há token válido - tenta gerar (pode ser que o token foi usado/expirado)
                    const paymentToken = await PaymentToken.create(
                      paymentMaisRecente.order_nsu,
                      user.email,
                      user.id
                    );
                    
                    console.log('✅ [LOGIN] Token gerado automaticamente:', {
                      token: paymentToken.token,
                      email: user.email,
                      order_nsu: paymentMaisRecente.order_nsu
                    });
                    
                    // Envia email com token (assíncrono, não bloqueia)
                    setImmediate(async () => {
                      try {
                        const valorReais = parseFloat(paymentMaisRecente.paid_amount || 1990) / 100;
                        await emailService.sendPaymentToken({
                          email: user.email,
                          token: paymentToken.token,
                          nome: user.nome,
                          orderNsu: paymentMaisRecente.order_nsu,
                          valor: valorReais
                        });
                      } catch (emailError) {
                        console.error('⚠️ [LOGIN] Erro ao enviar email com token (não crítico):', emailError);
                      }
                    });
                    
                    // Redireciona para validação
                    req.session.user = {
                      id: user.id,
                      nome: user.nome,
                      email: user.email,
                      is_admin: user.is_admin
                    };
                    req.session.lastActivity = Date.now();
                    req.session.requireTokenValidation = true;
                    
                    await User.updateLastLogin(user.id);
                    
                    req.session.save((err) => {
                      if (err) {
                        console.error('Erro ao salvar sessão:', err);
                        return res.render('auth/login', {
                          title: 'Login - Suporte DP',
                          error: 'Erro ao fazer login. Tente novamente.',
                          success: null
                        });
                      }
                      return res.redirect(`/validar-pagamento?email=${encodeURIComponent(user.email)}&from=login`);
                    });
                    return;
                  }
                } else {
                  throw new Error('Order NSU não encontrado');
                }
              } catch (tokenError) {
                console.error('❌ [LOGIN] Erro ao gerar token automaticamente:', tokenError);
                // Se falhar, mostra mensagem amigável
                return res.render('auth/login', {
                  title: 'Login - Suporte DP',
                  error: 'Seu pagamento foi confirmado, mas houve um problema ao gerar seu token de validação. Por favor, entre em contato com o suporte informando seu email.',
                  success: null
                });
              }
            }
          }
          
          // Se não há pagamento confirmado, bloqueia login
          console.log('⚠️ [LOGIN] Cliente tentando login sem pagamento ativo:', {
            user_id: user.id,
            email: user.email,
            subscription_expires_at: user.subscription_expires_at,
            subscription_status: user.subscription_status,
            has_paid_payment: false
          });
          return res.render('auth/login', {
            title: 'Login - Suporte DP',
            error: 'Sua assinatura está expirada ou não foi paga. Por favor, renove sua assinatura para continuar usando o sistema.',
            success: null
          });
        }

        // NOVO: Verifica se há token pendente mesmo com assinatura ativa (para novos pagamentos)
        const tokenPendente = await PaymentToken.findPendingTokenByEmail(user.email);
        
        if (tokenPendente) {
          // Há token pendente - reenvia email com token e redireciona para validação
          console.log('🔐 [LOGIN] Token pendente encontrado (renovação). Reenviando email com token:', {
            user_id: user.id,
            email: user.email,
            token: tokenPendente.token,
            order_nsu: tokenPendente.order_nsu
          });
          
          // Busca o pagamento relacionado para obter o valor
          const paymentRelacionado = await Payment.findByOrderNsu(tokenPendente.order_nsu);
          const valorReais = paymentRelacionado ? parseFloat(paymentRelacionado.paid_amount || 1990) / 100 : 19.90;
          
          // Reenvia email com token (assíncrono, não bloqueia)
          setImmediate(async () => {
            try {
              await emailService.sendPaymentToken({
                email: user.email,
                token: tokenPendente.token,
                nome: user.nome,
                orderNsu: tokenPendente.order_nsu,
                valor: valorReais
              });
              console.log('✅ [LOGIN] Email com token reenviado com sucesso:', user.email);
            } catch (emailError) {
              console.error('⚠️ [LOGIN] Erro ao reenviar email com token (não crítico):', emailError);
            }
          });
          
          // Cria sessão mas redireciona para validação de token
          req.session.user = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            is_admin: user.is_admin
          };
          req.session.lastActivity = Date.now();
          req.session.requireTokenValidation = true;
          
          await User.updateLastLogin(user.id);
          
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao salvar sessão:', err);
              return res.render('auth/login', {
                title: 'Login - Suporte DP',
                error: 'Erro ao fazer login. Tente novamente.',
                success: null
              });
            }
            return res.redirect(`/validar-pagamento?email=${encodeURIComponent(user.email)}&from=login`);
          });
          return;
        }
      }

      // Atualiza último login e última atividade
      await User.updateLastLogin(user.id);
      // Tenta atualizar última atividade (campo pode não existir)
      try {
        await db.query(
          'UPDATE users SET ultima_atividade = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );
      } catch (err) {
        // Ignora erro se campo não existir
      }

      // Cria sessão
      req.session.user = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        is_admin: user.is_admin
      };
      
      // Salva timestamp da última atividade na sessão
      req.session.lastActivity = Date.now();

      // Salva a sessão antes de redirecionar
      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão:', err);
          console.error('Detalhes:', err.message);
          return res.render('auth/login', {
            title: 'Login - Suporte DP',
            error: 'Erro ao fazer login. Tente novamente.',
          success: null
          });
        }

        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        
        // Redireciona imediatamente (sem delay)
        res.redirect(returnTo);
      });
    } catch (error) {
      console.error('Erro no login:', error);
      console.error('Stack:', error.stack);
      res.render('auth/login', {
        title: 'Login - Suporte DP',
        error: 'Erro ao fazer login. Tente novamente. ' + (process.env.NODE_ENV === 'development' ? error.message : ''),
        success: null
      });
    }
  }

  static async register(req, res) {
    if (req.method === 'GET') {
      // NOVO FLUXO: Permite cadastro sem pagamento (pagamento vem depois)
      // Não exige order_nsu, usuário se cadastra primeiro
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: null,
        order_nsu: null,
        payment: null
      });
    }

    const { nome, email, senha, confirmarSenha, whatsapp } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Por favor, preencha todos os campos corretamente.',
        order_nsu: null,
        payment: null
      });
    }

    if (senha !== confirmarSenha) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'As senhas não coincidem.',
        order_nsu: null,
        payment: null
      });
    }

    if (senha.length < 6) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'A senha deve ter pelo menos 6 caracteres.',
        order_nsu: null,
        payment: null
      });
    }

    try {
      // NOVO FLUXO: Verifica se email já está cadastrado
      const userExistente = await User.findByEmail(email);
      if (userExistente) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Este email já está cadastrado. Faça login ou use outro email.',
          order_nsu: null,
          payment: null
        });
      }

      // Verifica se há token validado na sessão (após validação de pagamento)
      const hasTokenValidated = req.session.pendingToken && req.session.pendingEmail;
      const tokenEmail = req.session.pendingEmail;
      
      // Se há token validado, verifica se o email corresponde
      if (hasTokenValidated && tokenEmail.toLowerCase() !== email.toLowerCase()) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'O email informado deve ser o mesmo usado no pagamento.',
          order_nsu: null,
          payment: null
        });
      }
      
      // NOVO FLUXO: Cria usuário - se há token validado, ativa assinatura imediatamente
      const user = await db.transaction(async (client) => {
        const bcrypt = require('bcrypt');
        const senhaHash = await bcrypt.hash(senha, 10);
        
        // Se há token validado, ativa assinatura por 30 dias
        let subscriptionStatus = 'pendente';
        let subscriptionExpiresAt = null;
        
        if (hasTokenValidated) {
          subscriptionStatus = 'ativa';
          const nextBillingDate = new Date();
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);
          subscriptionExpiresAt = nextBillingDate.toISOString().split('T')[0];
        }
        
        const userResult = await client.query(
          `INSERT INTO users (nome, email, senha_hash, is_admin, whatsapp, status, subscription_status, subscription_expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id, nome, email, is_admin, whatsapp, status, subscription_status, subscription_expires_at, created_at`,
          [
            nome,
            email,
            senhaHash,
            false,
            whatsapp || null,
            'ativo', // Status ativo (pode fazer login)
            subscriptionStatus, // 'ativa' se há token, 'pendente' caso contrário
            subscriptionExpiresAt // 30 dias se há token, null caso contrário
          ]
        );
        
        return userResult.rows[0];
      });
      
      // Limpa dados do token da sessão após criar usuário
      if (hasTokenValidated) {
        delete req.session.pendingToken;
        delete req.session.pendingEmail;
        delete req.session.pendingOrderNsu;
      }

      console.log('✅ Usuário criado com sucesso:', {
        id: user.id,
        email: user.email,
        subscription_status: user.subscription_status,
        has_token_validated: hasTokenValidated
      });
      
      // Envia email de notificação para admin (assíncrono, não bloqueia)
      setImmediate(async () => {
        try {
          await emailService.sendNewUserNotification({
            nome: user.nome,
            email: user.email,
            whatsapp: user.whatsapp || null,
            subscription_status: user.subscription_status,
            data_cadastro: new Date(user.created_at).toLocaleString('pt-BR')
          });
        } catch (emailError) {
          // Não bloqueia o registro se houver erro no email
          console.error('⚠️ Erro ao enviar notificação de novo usuário (não crítico):', emailError);
        }
      });
      
      // Login automático após cadastro
      req.session.user = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        is_admin: user.is_admin
      };
      
      // Salva timestamp da última atividade na sessão
      req.session.lastActivity = Date.now();

      // Salva a sessão antes de redirecionar
      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão após cadastro:', err);
          return res.render('auth/register', {
            title: 'Cadastro - Suporte DP',
            error: 'Conta criada, mas erro ao fazer login automático. Tente fazer login manualmente.',
            order_nsu: null,
            payment: null
          });
        }

        // Se há token validado, acesso já está liberado - redireciona para dashboard
        // Caso contrário, redireciona para /checkout (página de pagamento)
        if (hasTokenValidated) {
          req.session.successMessage = 'Cadastro realizado com sucesso! Seu acesso está liberado por 30 dias.';
          req.session.save(() => {
            res.redirect('/dashboard');
          });
        } else {
          req.session.successMessage = 'Conta criada com sucesso! Agora finalize o pagamento para liberar o acesso.';
          req.session.save(() => {
            res.redirect('/checkout');
          });
        }
      });
    } catch (error) {
      console.error('Erro no cadastro:', error);
      console.error('Stack:', error.stack);
      res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Erro ao criar conta. Tente novamente. ' + (process.env.NODE_ENV === 'development' ? error.message : ''),
        order_nsu: null,
        payment: null
      });
    }
  }

  static logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Erro ao fazer logout:', err);
      }
      res.redirect('/login');
    });
  }
}

module.exports = AuthController;

