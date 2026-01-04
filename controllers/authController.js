/**
 * CONTROLLER: AuthController
 * Gerencia autenticação e sessões
 */

const User = require('../models/User');
const Payment = require('../models/Payment');
const db = require('../config/database');
const { validationResult } = require('express-validator');

class AuthController {
  static async login(req, res) {
    if (req.method === 'GET') {
      let error = null;
      
      if (req.query.expired) {
        error = 'Sua sessão expirou por inatividade (10 minutos). Por favor, faça login novamente.';
      } else if (req.query.error === 'conta_bloqueada') {
        error = 'Sua conta está desativada ou bloqueada. Entre em contato com o administrador.';
      } else if (req.query.error === 'usuario_nao_encontrado') {
        error = 'Usuário não encontrado. Por favor, faça login novamente.';
      }
      
      return res.render('auth/login', {
        title: 'Login - Suporte DP',
        error: error
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
      // Verifica se tem order_nsu na query string (vem do redirect_url do InfinitePay)
      const { order_nsu } = req.query;
      
      let error = null;
      let payment = null;

      if (order_nsu) {
        // Verifica se existe pagamento aprovado
        payment = await Payment.findPaidByOrderNsu(order_nsu);
        if (!payment) {
          error = 'Pagamento não encontrado ou não aprovado. Por favor, realize o pagamento primeiro.';
        } else {
          // Verifica se já existe usuário para esse order_nsu
          const existingUser = await User.findByOrderNsu(order_nsu);
          if (existingUser) {
            error = 'Já existe um usuário cadastrado para este pagamento. Faça login com suas credenciais.';
          }
        }
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

    const { nome, email, senha, confirmarSenha, whatsapp, order_nsu } = req.body;
    const errors = validationResult(req);

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
      // Verifica se existe pagamento aprovado
      const payment = await Payment.findPaidByOrderNsu(order_nsu);
      if (!payment) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Pagamento não encontrado ou não aprovado. Por favor, realize o pagamento primeiro.',
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

      // Cria usuário vinculado ao order_nsu e pagamento
      const user = await User.create(nome, email, senha, false, {
        order_nsu: order_nsu,
        whatsapp: whatsapp || null,
        status: 'ativo',
        subscription_status: 'ativa',
        subscription_expires_at: payment.next_billing_date
      });

      // Atualiza user_id no pagamento
      await Payment.updateUserIdByOrderNsu(order_nsu, user.id);

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

