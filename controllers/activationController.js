/**
 * CONTROLLER: ActivationController
 * Gerencia cadastro de usuário via link de ativação
 * 
 * ⚠️ IMPORTANTE: Usuário só é criado após preencher formulário de cadastro
 */

const ActivationLink = require('../models/ActivationLink');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class ActivationController {
  /**
   * Exibe formulário de cadastro com token
   * GET /ativar/:token
   */
  static async showActivationForm(req, res) {
    const { token } = req.params;

    if (!token) {
      return res.render('error', {
        title: 'Erro - Link Inválido',
        error: 'Token de ativação não fornecido.'
      });
    }

    try {
      // Valida token
      const validation = await ActivationLink.validateToken(token);

      if (!validation.valid) {
        return res.render('error', {
          title: 'Erro - Link Inválido',
          error: validation.error
        });
      }

      const link = validation.link;

      // Verifica se email já está cadastrado (pode ter sido cadastrado entre a criação do link e o acesso)
      const userExists = await User.findByEmail(link.email);
      if (userExists) {
        return res.render('error', {
          title: 'Erro - Usuário Já Cadastrado',
          error: 'Este email já está cadastrado no sistema. Por favor, faça login.'
        });
      }

      // Renderiza formulário de cadastro
      return res.render('auth/activate', {
        title: 'Complete Seu Cadastro - Suporte DP',
        token: token,
        email: link.email,
        nome_cliente: link.nome_cliente,
        error: null
      });

    } catch (error) {
      console.error('❌ Erro ao exibir formulário de ativação:', error);
      return res.render('error', {
        title: 'Erro',
        error: 'Erro ao processar link de ativação. Tente novamente mais tarde.'
      });
    }
  }

  /**
   * Processa cadastro via link de ativação
   * POST /ativar/:token
   */
  static async processActivation(req, res) {
    const { token } = req.params;
    const { nome, senha, confirmarSenha } = req.body;

    // Validações básicas
    if (!nome || !senha || !confirmarSenha) {
      const validation = await ActivationLink.validateToken(token);
      return res.render('auth/activate', {
        title: 'Complete Seu Cadastro - Suporte DP',
        token: token,
        email: validation.link?.email || '',
        nome_cliente: validation.link?.nome_cliente || '',
        error: 'Por favor, preencha todos os campos.'
      });
    }

    // Valida senha
    if (senha.length < 6) {
      const validation = await ActivationLink.validateToken(token);
      return res.render('auth/activate', {
        title: 'Complete Seu Cadastro - Suporte DP',
        token: token,
        email: validation.link?.email || '',
        nome_cliente: validation.link?.nome_cliente || '',
        error: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    // Valida confirmação de senha
    if (senha !== confirmarSenha) {
      const validation = await ActivationLink.validateToken(token);
      return res.render('auth/activate', {
        title: 'Complete Seu Cadastro - Suporte DP',
        token: token,
        email: validation.link?.email || '',
        nome_cliente: validation.link?.nome_cliente || '',
        error: 'As senhas não coincidem.'
      });
    }

    try {
      // Valida token novamente (pode ter expirado ou sido usado)
      const validation = await ActivationLink.validateToken(token);

      if (!validation.valid) {
        return res.render('error', {
          title: 'Erro - Link Inválido',
          error: validation.error
        });
      }

      const link = validation.link;

      // Verifica se email já está cadastrado
      const userExists = await User.findByEmail(link.email);
      if (userExists) {
        // Marca link como usado mesmo que usuário já exista
        await ActivationLink.markAsUsed(token);
        
        return res.render('error', {
          title: 'Erro - Usuário Já Cadastrado',
          error: 'Este email já está cadastrado no sistema. Por favor, faça login.'
        });
      }

      // Cria usuário no banco principal
      const user = await User.create(nome, link.email, senha, false);

      // Marca link como usado
      await ActivationLink.markAsUsed(token);

      console.log(`✅ Usuário criado via ativação: ${link.email} (${link.plataforma})`);

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
          console.error('❌ Erro ao salvar sessão após ativação:', err);
          return res.render('error', {
            title: 'Erro',
            error: 'Conta criada, mas erro ao fazer login automático. Tente fazer login manualmente.'
          });
        }

        // Redireciona para dashboard
        res.redirect('/dashboard');
      });

    } catch (error) {
      console.error('❌ Erro ao processar ativação:', error);
      
      // Tenta renderizar formulário novamente com erro
      try {
        const validation = await ActivationLink.validateToken(token);
        return res.render('auth/activate', {
          title: 'Complete Seu Cadastro - Suporte DP',
          token: token,
          email: validation.link?.email || '',
          nome_cliente: validation.link?.nome_cliente || '',
          error: 'Erro ao criar conta. Tente novamente. ' + 
                 (process.env.NODE_ENV === 'development' ? error.message : '')
        });
      } catch (renderError) {
        return res.render('error', {
          title: 'Erro',
          error: 'Erro ao processar cadastro. Tente novamente mais tarde.'
        });
      }
    }
  }
}

module.exports = ActivationController;

