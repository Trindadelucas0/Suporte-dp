/**
 * CONTROLLER: AuthController
 * Gerencia autenticação e sessões
 */

const User = require('../models/User');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
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
        error: 'Por favor, preencha todos os campos corretamente.'
      });
    }

    try {
      const user = await User.findByEmail(email);
      
      if (!user) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Email ou senha incorretos.'
        });
      }

      const senhaValida = await User.verifyPassword(senha, user.senha_hash);
      
      if (!senhaValida) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Email ou senha incorretos.'
        });
      }

      // Verifica se usuário está ativo e não bloqueado
      if (user.ativo === false || user.bloqueado === true) {
        return res.render('auth/login', {
          title: 'Login - Suporte DP',
          error: 'Sua conta está desativada ou bloqueada. Entre em contato com o administrador.'
        });
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
            error: 'Erro ao fazer login. Tente novamente.'
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
        error: 'Erro ao fazer login. Tente novamente. ' + (process.env.NODE_ENV === 'development' ? error.message : '')
      });
    }
  }

  static async register(req, res) {
    if (req.method === 'GET') {
      // Tenta obter order_nsu da query string ou da sessão (backup)
      const orderNsuFromQuery = req.query.order_nsu;
      const orderNsuFromSession = req.session?.pendingOrderNsu;
      const order_nsu = orderNsuFromQuery || orderNsuFromSession;
      
      let error = null;
      let payment = null;

      if (order_nsu) {
        // VALIDAÇÃO DE SEGURANÇA: Verifica se o order_nsu existe e é válido
        const order = await Order.findByOrderNsu(order_nsu);
        if (!order) {
          console.log('⚠️ Tentativa de acesso direto com order_nsu inválido:', order_nsu);
          return res.render('auth/register', {
            title: 'Cadastro - Suporte DP',
            error: 'Acesso negado. Por favor, adquira o sistema primeiro através da página de aquisição.',
            order_nsu: null,
            payment: null
          });
        }
        
        // Se order foi cancelado, negar acesso
        if (order.status === 'cancelled') {
          console.log('⚠️ Tentativa de acesso com order cancelado:', order_nsu);
          return res.render('auth/register', {
            title: 'Cadastro - Suporte DP',
            error: 'Este pedido foi cancelado. Por favor, adquira o sistema novamente.',
            order_nsu: null,
            payment: null
          });
        }
        
        // SOLUÇÃO: Se InfinitePay redirecionou, pagamento foi aprovado
        // Não precisamos verificar Payment.findPaidByOrderNsu
        // Apenas verificamos se já existe usuário para evitar duplicação
        
        console.log('✅ Redirect do InfinitePay detectado - pagamento aprovado:', order_nsu);
        
        // Verifica se já existe usuário para esse order_nsu (evita duplicação)
        const existingUser = await User.findByOrderNsu(order_nsu);
        if (existingUser) {
          console.log('⚠️ Usuário já existe para este order_nsu - redirecionando para login:', order_nsu);
          // Limpa order_nsu da sessão se existir
          if (req.session?.pendingOrderNsu) {
            delete req.session.pendingOrderNsu;
            req.session.save();
          }
          return res.redirect('/login?msg=ja_cadastrado');
        }
        
        // Limpa order_nsu da sessão se encontrou order válido
        if (req.session?.pendingOrderNsu) {
          delete req.session.pendingOrderNsu;
          req.session.save();
        }
        
        // Tudo OK - permite cadastro (não precisa verificar payment, confia no redirect)
      } else {
        error = 'Acesso direto ao cadastro não permitido. Por favor, adquira o sistema primeiro.';
      }

      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: error,
        order_nsu: order_nsu || null,
        payment: payment
      });
    }

    const { nome, email, senha, confirmarSenha, whatsapp } = req.body;
    const errors = validationResult(req);

    // Tenta obter order_nsu do body ou da sessão (backup)
    const orderNsuFromBody = req.body.order_nsu;
    const orderNsuFromSession = req.session?.pendingOrderNsu;
    const order_nsu = orderNsuFromBody || orderNsuFromSession;

    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Por favor, preencha todos os campos corretamente.',
        order_nsu: order_nsu || null
      });
    }

    if (senha !== confirmarSenha) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'As senhas não coincidem.',
        order_nsu: order_nsu || null
      });
    }

    if (senha.length < 6) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'A senha deve ter pelo menos 6 caracteres.',
        order_nsu: order_nsu || null
      });
    }

    // VALIDAÇÃO OBRIGATÓRIA: Verificar pagamento aprovado
    if (!order_nsu) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Pedido não informado. Por favor, adquira o sistema primeiro.',
        order_nsu: null
      });
    }

    try {
      // VALIDAÇÃO DE SEGURANÇA: Verifica se o order_nsu existe e é válido
      const order = await Order.findByOrderNsu(order_nsu);
      if (!order) {
        console.log('⚠️ Tentativa de acesso POST com order_nsu inválido:', order_nsu);
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Acesso negado. Por favor, adquira o sistema primeiro através da página de aquisição.',
          order_nsu: null
        });
      }
      
      // Verifica se existe pagamento aprovado (com retry para aguardar webhook)
      let payment = await Payment.findPaidByOrderNsu(order_nsu);
      
      // Se não encontrou, tenta novamente com retry (pode ser que webhook ainda não processou)
      if (!payment) {
        console.log('Pagamento não encontrado no POST, aguardando webhook processar...', order_nsu);
        for (let tentativa = 0; tentativa < 3; tentativa++) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos por tentativa
          payment = await Payment.findPaidByOrderNsu(order_nsu);
          if (payment) {
            console.log(`Pagamento encontrado após ${tentativa + 1} tentativa(s) no POST`, order_nsu);
            break;
          }
        }
      }
      
      if (!payment) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Pagamento ainda não foi processado pelo sistema. Aguarde alguns instantes e tente novamente. Se o problema persistir, recarregue a página ou verifique se o pagamento foi concluído.',
          order_nsu: order_nsu
        });
      }

      // Verifica se já existe usuário para esse order_nsu
      const existingUserForOrder = await User.findByOrderNsu(order_nsu);
      if (existingUserForOrder) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Já existe um usuário cadastrado para este pagamento. Faça login com suas credenciais.',
          order_nsu: order_nsu
        });
      }

      // Verifica se email já está cadastrado (outro usuário)
      const userExistente = await User.findByEmail(email);
      if (userExistente) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Este email já está cadastrado.',
          order_nsu: order_nsu
        });
      }

      // Cria usuário e vincula ao pagamento em uma transação SQL (garante atomicidade)
      const user = await db.transaction(async (client) => {
        // 1. Criar usuário usando query direta (dentro da transação)
        const bcrypt = require('bcrypt');
        const senhaHash = await bcrypt.hash(senha, 10);
        
        const userResult = await client.query(
          `INSERT INTO users (nome, email, senha_hash, is_admin, order_nsu, whatsapp, status, subscription_status, subscription_expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id, nome, email, is_admin, order_nsu, whatsapp, status, subscription_status, subscription_expires_at, created_at`,
          [
            nome,
            email,
            senhaHash,
            false,
            order_nsu,
            whatsapp || null,
            'ativo',
            'ativa',
            nextBillingDate
          ]
        );
        
        const newUser = userResult.rows[0];
        
        // 2. Atualizar user_id no pagamento (dentro da mesma transação)
        await client.query(
          'UPDATE payments SET user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE order_nsu = $2 AND user_id IS NULL',
          [newUser.id, order_nsu]
        );
        
        return newUser;
      });

      // Limpa order_nsu da sessão após cadastro bem-sucedido
      if (req.session?.pendingOrderNsu) {
        delete req.session.pendingOrderNsu;
        req.session.save();
      }

      console.log('Usuário criado com sucesso:', {
        id: user.id,
        email: user.email,
        order_nsu: user.order_nsu,
        subscription_expires_at: user.subscription_expires_at
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
          console.error('Detalhes:', err.message);
          return res.render('auth/register', {
            title: 'Cadastro - Suporte DP',
            error: 'Conta criada, mas erro ao fazer login automático. Tente fazer login manualmente.',
            order_nsu: order_nsu
          });
        }

        res.redirect('/dashboard');
      });
    } catch (error) {
      console.error('Erro no cadastro:', error);
      console.error('Stack:', error.stack);
      res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Erro ao criar conta. Tente novamente. ' + (process.env.NODE_ENV === 'development' ? error.message : ''),
        order_nsu: order_nsu || null
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

