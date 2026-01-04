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

      // VERIFICAÇÃO DE PAGAMENTO: Se tiver pago, permite login. Se não, bloqueia.
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

        if (semAssinatura || assinaturaExpirada || assinaturaInadimplente || assinaturaPendente) {
          console.log('⚠️ [LOGIN] Cliente tentando login sem pagamento ativo:', {
            user_id: user.id,
            email: user.email,
            subscription_expires_at: user.subscription_expires_at,
            subscription_status: user.subscription_status
          });
          const mensagem = assinaturaPendente 
            ? 'Complete seu pagamento para liberar o acesso. Acesse a página de checkout após fazer login.'
            : 'Sua assinatura está expirada ou não foi paga. Por favor, renove sua assinatura para continuar usando o sistema.';
          return res.render('auth/login', {
            title: 'Login - Suporte DP',
            error: mensagem,
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

      // NOVO FLUXO: Cria usuário SEM pagamento (status pendente)
      const user = await db.transaction(async (client) => {
        const bcrypt = require('bcrypt');
        const senhaHash = await bcrypt.hash(senha, 10);
        
        // Cria usuário com subscription_status = 'pendente' (aguardando pagamento)
        // Status = 'ativo' mas subscription_status = 'pendente' (não pode acessar até pagar)
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
            'pendente', // Subscription pendente (aguardando pagamento)
            null // Sem data de expiração ainda (será definida após pagamento)
          ]
        );
        
        return userResult.rows[0];
      });

      console.log('✅ Usuário criado com sucesso (aguardando pagamento):', {
        id: user.id,
        email: user.email,
        subscription_status: user.subscription_status
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

        // NOVO FLUXO: Redireciona para /checkout (página de pagamento)
        res.redirect('/checkout');
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

