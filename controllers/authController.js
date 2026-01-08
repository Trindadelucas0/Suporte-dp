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
  /**
   * Verifica se a assinatura do usuário está ativa
   * @param {Object} user - Objeto do usuário com subscription_status e subscription_expires_at
   * @returns {Boolean} True se assinatura está ativa (status 'ativa' e não expirada)
   * @private
   */
  static _isSubscriptionActive(user) {
    // Validações básicas
    if (!user || !user.subscription_status) {
      return false;
    }
    
    // Verifica se status é 'ativa'
    if (user.subscription_status !== 'ativa') {
      return false;
    }
    
    // Verifica se tem data de expiração
    if (!user.subscription_expires_at) {
      return false;
    }
    
    // Verifica se não expirou
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataExpiracao = new Date(user.subscription_expires_at);
    dataExpiracao.setHours(0, 0, 0, 0);
    
    return dataExpiracao >= hoje;
  }

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
      } else if (req.query.token_validado === 'true') {
        success = 'Token validado com sucesso! Sua assinatura está ativa por 30 dias. Faça login para acessar o sistema.';
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
      // Normaliza email antes de buscar
      const emailNormalizado = email ? email.trim().toLowerCase() : null;
      
      if (!emailNormalizado) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Por favor, informe um email válido.',
          success: null
        });
      }
      
      console.log('🔍 [LOGIN] Tentando fazer login:', {
        email: emailNormalizado
      });
      
      const user = await User.findByEmail(emailNormalizado);
      
      if (!user) {
        console.log('⚠️ [LOGIN] Usuário não encontrado:', emailNormalizado);
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Email ou senha incorretos.',
          success: null
        });
      }
      
      console.log('✅ [LOGIN] Usuário encontrado:', {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin
      });

      const senhaValida = await User.verifyPassword(senha, user.senha_hash);
      
      if (!senhaValida) {
        console.log('⚠️ [LOGIN] Senha inválida para usuário:', user.email);
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Email ou senha incorretos.',
          success: null
        });
      }
      
      console.log('✅ [LOGIN] Senha válida');

      // Verifica se usuário está ativo e não bloqueado (campos podem não existir)
      const ativo = user.ativo !== undefined ? user.ativo : true;
      const bloqueado = user.bloqueado !== undefined ? user.bloqueado : false;
      
      if (ativo === false || bloqueado === true) {
        console.log('⚠️ [LOGIN] Conta desativada ou bloqueada:', {
          email: user.email,
          ativo: ativo,
          bloqueado: bloqueado
        });
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
        
        // Log para debug
        console.log('🔍 [LOGIN] Verificando assinatura do usuário:', {
          user_id: user.id,
          email: user.email,
          subscription_status: user.subscription_status,
          subscription_expires_at: user.subscription_expires_at,
          status: user.status
        });
        
        let dataExpiracao = null;
        if (user.subscription_expires_at) {
          dataExpiracao = new Date(user.subscription_expires_at);
          dataExpiracao.setHours(0, 0, 0, 0);
        }

        const assinaturaExpirada = dataExpiracao && dataExpiracao < hoje;
        const assinaturaInadimplente = user.subscription_status === 'inadimplente';
        const assinaturaPendente = user.subscription_status === 'pendente';
        const semAssinatura = !user.subscription_expires_at || !user.subscription_status || user.subscription_status === null;
        const assinaturaAtiva = AuthController._isSubscriptionActive(user);

        // REGRA PRINCIPAL: Se assinatura está ATIVA, permite login direto SEM verificar tokens
        // Tokens pendentes só importam se a assinatura NÃO está ativa
        if (assinaturaAtiva) {
          console.log('✅ [LOGIN] Assinatura ativa - permitindo login direto:', {
            user_id: user.id,
            email: user.email,
            subscription_status: user.subscription_status,
            subscription_expires_at: user.subscription_expires_at
          });
          
          // Cria sessão e permite acesso normalmente
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
          
          // Verifica e cria notificações de assinatura prestes a vencer
          try {
            const AssinaturaNotificacaoService = require('../services/assinaturaNotificacaoService');
            await AssinaturaNotificacaoService.verificarEVincularNotificacoes(user.id);
          } catch (notifError) {
            console.warn('⚠️ Aviso ao verificar notificações de assinatura:', notifError.message);
            // Não bloqueia o login se houver erro na notificação
          }
          
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

        // Se não tem assinatura ativa (expirada, inadimplente ou sem assinatura), verifica se há pagamento confirmado aguardando validação de token
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
              // Há token pendente - NÃO reenvia email, apenas redireciona para validação
              // O email já foi enviado quando o token foi gerado no webhook
              console.log('🔐 [LOGIN] Token pendente encontrado, mostrando página de aguardo:', {
                user_id: user.id,
                email: user.email,
                token: tokenPendente.token,
                order_nsu: tokenPendente.order_nsu
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
                  // Verifica se já existe token válido (não usado, não expirado) para este pagamento
                  const tokensExistentes = await PaymentToken.findByOrderNsu(paymentMaisRecente.order_nsu);
                  const tokenValidoExistente = tokensExistentes.find(t => {
                    const now = new Date();
                    const expiresAt = new Date(t.expires_at);
                    return !t.used && expiresAt > now;
                  });
                  
                  if (tokenValidoExistente) {
                    // Há token válido pendente - redireciona para validação
                    console.log('🔐 [LOGIN] Token pendente encontrado, redirecionando para validação:', {
                      order_nsu: paymentMaisRecente.order_nsu,
                      token_existente: tokenValidoExistente.token,
                      email: user.email
                    });
                    
                    // Cria sessão e redireciona para validação de token
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
                    // Não há token válido pendente - verifica se assinatura está ativa
                    // Se assinatura está ativa, permite login normalmente
                    // Se não está ativa, informa que precisa aguardar email ou fazer novo pagamento
                    console.log('ℹ️ [LOGIN] Não há token válido pendente para este pagamento:', {
                      order_nsu: paymentMaisRecente.order_nsu,
                      email: user.email,
                      subscription_status: user.subscription_status,
                      subscription_expires_at: user.subscription_expires_at
                    });
                    
                    // Se assinatura está ativa, permite login normalmente
                    if (AuthController._isSubscriptionActive(user)) {
                        // Assinatura ativa - permite login
                        req.session.user = {
                          id: user.id,
                          nome: user.nome,
                          email: user.email,
                          is_admin: user.is_admin
                        };
                        req.session.lastActivity = Date.now();
                        
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
                    
                    // Assinatura não está ativa - informa que precisa aguardar email ou fazer novo pagamento
                    return res.render('auth/login', {
                      title: 'Login - Suporte DP',
                      error: 'Seu pagamento foi confirmado, mas não há token de validação disponível. Verifique seu email ou entre em contato com o suporte.',
                      success: null
                    });
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
      console.error('❌ [LOGIN] Erro no login:', error);
      console.error('Tipo do erro:', error.constructor.name);
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error.code === '42703' || (error.message.includes('column') && error.message.includes('does not exist'))) {
        errorMessage = 'Erro na estrutura do banco de dados. Entre em contato com o suporte.';
        console.error('⚠️ COLUNA NÃO EXISTE NO BANCO! Verifique se as migrations foram executadas.');
      } else if (process.env.NODE_ENV === 'development') {
        errorMessage = `Erro ao fazer login: ${error.message}`;
      }
      
      res.render('auth/login', {
        title: 'Login - Suporte DP',
        error: errorMessage,
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
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      console.log('❌ Erros de validação:', errorMessages);
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: errorMessages || 'Por favor, preencha todos os campos corretamente.',
        order_nsu: null,
        payment: null
      });
    }

    // Valida e normaliza nome
    const nomeNormalizado = nome ? nome.trim() : null;
    if (!nomeNormalizado || nomeNormalizado.length < 3) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Nome deve ter pelo menos 3 caracteres.',
        order_nsu: null,
        payment: null
      });
    }

    // Normaliza email explicitamente (já deve estar normalizado pelo validator, mas garantimos)
    // O validator já normalizou o email no req.body, mas garantimos aqui também
    const emailNormalizado = email ? email.trim().toLowerCase() : null;
    
    if (!emailNormalizado) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Email inválido.',
        order_nsu: null,
        payment: null
      });
    }

    // Validação de senha (já validada pelo express-validator, mas verificamos novamente por segurança)
    if (!senha || senha.length < 6) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'A senha deve ter pelo menos 6 caracteres.',
        order_nsu: null,
        payment: null
      });
    }

    // Validação de confirmação de senha (já validada pelo express-validator)
    if (senha !== confirmarSenha) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'As senhas não coincidem.',
        order_nsu: null,
        payment: null
      });
    }

    try {
      console.log('🔍 Iniciando processo de cadastro:', {
        nome: nomeNormalizado,
        email: emailNormalizado,
        temWhatsapp: !!whatsapp
      });
      
      // NOVO FLUXO: Verifica se email já está cadastrado (usa email normalizado)
      console.log('🔍 Verificando se email já existe...');
      const userExistente = await User.findByEmail(emailNormalizado);
      if (userExistente) {
        console.log('⚠️ Email já cadastrado:', emailNormalizado);
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Este email já está cadastrado. Faça login ou use outro email.',
          order_nsu: null,
          payment: null
        });
      }
      console.log('✅ Email disponível para cadastro');

      // Verifica se há token validado na sessão (após validação de pagamento)
      const hasTokenValidated = req.session.pendingToken && req.session.pendingEmail;
      const tokenEmail = req.session.pendingEmail ? req.session.pendingEmail.toLowerCase() : null;
      
      // Se há token validado, verifica se o email corresponde
      if (hasTokenValidated && tokenEmail !== emailNormalizado) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'O email informado deve ser o mesmo usado no pagamento.',
          order_nsu: null,
          payment: null
        });
      }
      
      console.log('📝 Tentando criar usuário:', {
        nome: nomeNormalizado,
        email: emailNormalizado,
        hasTokenValidated: hasTokenValidated
      });
      
      // NOVO FLUXO: Cria usuário - se há token validado, ativa assinatura imediatamente
      const user = await db.transaction(async (client) => {
        try {
          const bcrypt = require('bcrypt');
          const senhaHash = await bcrypt.hash(senha, 10);
          
          // Verifica quais campos existem na tabela users
          const columnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            AND column_name IN ('whatsapp', 'status', 'subscription_status', 'subscription_expires_at')
          `);
          
          const existingColumns = columnsCheck.rows.map(r => r.column_name);
          const hasWhatsapp = existingColumns.includes('whatsapp');
          const hasStatus = existingColumns.includes('status');
          const hasSubscriptionStatus = existingColumns.includes('subscription_status');
          const hasSubscriptionExpiresAt = existingColumns.includes('subscription_expires_at');
          
          // Se há token validado, ativa assinatura por 30 dias a partir de AGORA
          let subscriptionStatus = 'pendente';
          let subscriptionExpiresAt = null;
          
          if (hasTokenValidated) {
            subscriptionStatus = 'ativa';
            const agora = new Date();
            const dataExpiracao = new Date(agora);
            dataExpiracao.setDate(dataExpiracao.getDate() + 30);
            subscriptionExpiresAt = dataExpiracao.toISOString().split('T')[0];
            
            console.log('✅ Token validado - Criando usuário com assinatura ativa por 30 dias:', {
              email: emailNormalizado,
              data_ativacao: agora.toISOString(),
              data_expiracao: subscriptionExpiresAt,
              dias_acesso: 30
            });
          }
          
          // Normaliza whatsapp (remove espaços e caracteres especiais, mantém apenas números)
          const whatsappNormalizado = whatsapp ? whatsapp.trim().replace(/\D/g, '') : null;
          
          // Monta query dinamicamente baseado nos campos que existem
          let fields = 'nome, email, senha_hash, is_admin';
          let values = [nomeNormalizado, emailNormalizado, senhaHash, false];
          let placeholders = ['$1', '$2', '$3', '$4'];
          let paramCount = 5;
          
          if (hasWhatsapp) {
            fields += ', whatsapp';
            values.push(whatsappNormalizado || null);
            placeholders.push(`$${paramCount++}`);
          }
          
          if (hasStatus) {
            fields += ', status';
            values.push('ativo');
            placeholders.push(`$${paramCount++}`);
          }
          
          if (hasSubscriptionStatus) {
            fields += ', subscription_status';
            values.push(subscriptionStatus);
            placeholders.push(`$${paramCount++}`);
          }
          
          if (hasSubscriptionExpiresAt) {
            fields += ', subscription_expires_at';
            values.push(subscriptionExpiresAt);
            placeholders.push(`$${paramCount++}`);
          }
          
          // Campos de timestamp (sempre existem) - usa função SQL diretamente
          fields += ', created_at, updated_at';
          placeholders.push('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP');
          
          // Monta campos de retorno
          let returnFields = 'id, nome, email, is_admin, created_at';
          if (hasWhatsapp) returnFields += ', whatsapp';
          if (hasStatus) returnFields += ', status';
          if (hasSubscriptionStatus) returnFields += ', subscription_status';
          if (hasSubscriptionExpiresAt) returnFields += ', subscription_expires_at';
          
          const userResult = await client.query(
            `INSERT INTO users (${fields})
             VALUES (${placeholders.join(', ')})
             RETURNING ${returnFields}`,
            values // Apenas os valores, sem CURRENT_TIMESTAMP
          );
          
          if (!userResult.rows || !userResult.rows[0]) {
            throw new Error('Erro ao criar usuário: nenhum registro retornado');
          }
          
          // Garante valores padrão para campos que podem não existir
          const userData = userResult.rows[0];
          if (!hasStatus) userData.status = 'ativo';
          if (!hasSubscriptionStatus) userData.subscription_status = subscriptionStatus;
          if (!hasSubscriptionExpiresAt) userData.subscription_expires_at = subscriptionExpiresAt;
          
          return userData;
        } catch (dbError) {
          console.error('❌ Erro na transação de criação de usuário:', dbError);
          console.error('Código do erro:', dbError.code);
          console.error('Mensagem:', dbError.message);
          console.error('Detalhe:', dbError.detail);
          console.error('Query que falhou:', dbError.query);
          console.error('Parâmetros:', dbError.parameters);
          throw dbError;
        }
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

      // Define mensagem de sucesso antes de salvar
      if (hasTokenValidated) {
        req.session.successMessage = 'Cadastro realizado com sucesso! Seu acesso está liberado por 30 dias.';
      } else {
        req.session.successMessage = 'Conta criada com sucesso! Agora finalize o pagamento para liberar o acesso.';
      }

      // Salva a sessão uma única vez antes de redirecionar
      req.session.save((err) => {
        if (err) {
          console.error('❌ Erro ao salvar sessão após cadastro:', err);
          console.error('Detalhes do erro:', err.message);
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
          res.redirect('/dashboard');
        } else {
          res.redirect('/checkout');
        }
      });
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      console.error('Tipo do erro:', error.constructor.name);
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      // Verifica se é erro de duplicação de email (violação de constraint única)
      if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        errorMessage = 'Este email já está cadastrado. Faça login ou use outro email.';
      } else if (error.code === '23502' || error.message.includes('not null')) {
        errorMessage = 'Por favor, preencha todos os campos obrigatórios.';
      } else if (error.code === '42703' || error.message.includes('column') && error.message.includes('does not exist')) {
        errorMessage = 'Erro na estrutura do banco de dados. Entre em contato com o suporte.';
        console.error('⚠️ COLUNA NÃO EXISTE NO BANCO! Verifique se as migrations foram executadas.');
      } else if (process.env.NODE_ENV === 'development') {
        errorMessage = `Erro ao criar conta: ${error.message}`;
      }
      
      res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: errorMessage,
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

