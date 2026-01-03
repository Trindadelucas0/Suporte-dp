/**
 * CONTROLLER: AuthController
 * Gerencia autenticação e sessões
 */

const User = require('../models/User');
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

      // Verifica se está bloqueado por pagamento
      if (user.bloqueado_pagamento === true) {
        // Permite login mas redireciona para página de bloqueio
        req.session.user = {
          id: user.id,
          nome: user.nome,
          email: user.email,
          is_admin: user.is_admin
        };
        req.session.lastActivity = Date.now();
        req.session.save((err) => {
          if (err) {
            console.error('Erro ao salvar sessão:', err);
            return res.render('auth/login', {
              title: 'Login - Suporte DP',
              error: 'Erro ao fazer login. Tente novamente.'
            });
          }
          res.redirect('/cobranca/blocked');
        });
        return;
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

  /**
   * Cadastro via link de ativação (após assinatura)
   */
  static async cadastroViaLink(req, res) {
    const { token } = req.params;

    if (req.method === 'GET') {
      // Valida token
      const cadastroService = require('../services/cadastroService');
      const validacao = await cadastroService.validarTokenCadastro(token);

      if (!validacao.success) {
        return res.render('error', {
          title: 'Erro - Suporte DP',
          error: validacao.error || 'Link inválido ou expirado'
        });
      }

      // Renderiza formulário de cadastro com email pré-preenchido
      res.render('auth/cadastro-link', {
        title: 'Complete seu Cadastro - Suporte DP',
        token: token,
        email: validacao.email,
        nome: validacao.nome || ''
      });
      return;
    }

    // POST: Processa cadastro
    const { nome, email, senha, confirmarSenha } = req.body;

    // Valida token novamente
    const cadastroService = require('../services/cadastroService');
    const validacao = await cadastroService.validarTokenCadastro(token);

    if (!validacao.success) {
      return res.render('error', {
        title: 'Erro - Suporte DP',
        error: 'Link inválido ou expirado'
      });
    }

    // Validações
    if (!nome || !senha || !confirmarSenha) {
      return res.render('auth/cadastro-link', {
        title: 'Complete seu Cadastro - Suporte DP',
        token: token,
        email: validacao.email,
        nome: nome || validacao.nome || '',
        error: 'Todos os campos são obrigatórios.'
      });
    }

    if (senha !== confirmarSenha) {
      return res.render('auth/cadastro-link', {
        title: 'Complete seu Cadastro - Suporte DP',
        token: token,
        email: validacao.email,
        nome: nome,
        error: 'As senhas não coincidem.'
      });
    }

    if (senha.length < 6) {
      return res.render('auth/cadastro-link', {
        title: 'Complete seu Cadastro - Suporte DP',
        token: token,
        email: validacao.email,
        nome: nome,
        error: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    // Verifica se email do token corresponde
    if (email !== validacao.email) {
      return res.render('auth/cadastro-link', {
        title: 'Complete seu Cadastro - Suporte DP',
        token: token,
        email: validacao.email,
        nome: nome,
        error: 'Email não corresponde ao link de ativação.'
      });
    }

    try {
      // Busca usuário existente pelo email
      let user = await User.findByEmail(email);

      if (user) {
        // Usuário já existe: atualiza senha e nome
        const bcrypt = require('bcrypt');
        const senhaHash = await bcrypt.hash(senha, 10);
        
        await db.query(
          'UPDATE users SET nome = $1, senha_hash = $2 WHERE email = $3',
          [nome, senhaHash, email]
        );

        user = await User.findByEmail(email);
      } else {
        // Cria novo usuário
        user = await User.create(nome, email, senha, false);
      }

      // Marca token como usado
      await cadastroService.marcarTokenComoUsado(token);

      // Libera acesso (se estiver bloqueado)
      await db.query(
        'UPDATE users SET bloqueado_pagamento = FALSE WHERE id = $1',
        [user.id]
      );

      // Login automático
      req.session.user = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        is_admin: user.is_admin
      };
      req.session.lastActivity = Date.now();

      req.session.save((err) => {
        if (err) {
          console.error('Erro ao salvar sessão:', err);
          return res.render('auth/cadastro-link', {
            title: 'Complete seu Cadastro - Suporte DP',
            token: token,
            email: email,
            nome: nome,
            error: 'Cadastro concluído, mas erro ao fazer login. Tente fazer login manualmente.'
          });
        }

        res.redirect('/dashboard');
      });
    } catch (error) {
      console.error('Erro no cadastro via link:', error);
      res.render('auth/cadastro-link', {
        title: 'Complete seu Cadastro - Suporte DP',
        token: token,
        email: validacao.email,
        nome: nome,
        error: 'Erro ao completar cadastro. Tente novamente.'
      });
    }
  }

  static async register(req, res) {
    if (req.method === 'GET') {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: null
      });
    }

    const { nome, email, senha, confirmarSenha } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Por favor, preencha todos os campos corretamente.'
      });
    }

    if (senha !== confirmarSenha) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'As senhas não coincidem.'
      });
    }

    if (senha.length < 6) {
      return res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    try {
      const userExistente = await User.findByEmail(email);
      
      if (userExistente) {
        return res.render('auth/register', {
          title: 'Cadastro - Suporte DP',
          error: 'Este email já está cadastrado.'
        });
      }

      const user = await User.create(nome, email, senha, false);
      
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
            error: 'Conta criada, mas erro ao fazer login automático. Tente fazer login manualmente.'
          });
        }

        res.redirect('/dashboard');
      });
    } catch (error) {
      console.error('Erro no cadastro:', error);
      console.error('Stack:', error.stack);
      res.render('auth/register', {
        title: 'Cadastro - Suporte DP',
        error: 'Erro ao criar conta. Tente novamente. ' + (process.env.NODE_ENV === 'development' ? error.message : '')
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

