/**
 * CONTROLLER: PerfilController
 * Gerencia perfil do usuário (dados básicos e adicionais)
 */

const User = require('../models/User');
const PaymentToken = require('../models/PaymentToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

class PerfilController {
  /**
   * Exibe página de perfil do usuário
   */
  static async index(req, res) {
    const userId = req.session.user.id;

    try {
      const user = await User.findProfileById(userId);
      
      if (!user) {
        return res.status(404).render('error', {
          title: 'Erro',
          error: 'Usuário não encontrado'
        });
      }

      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: null,
        success: null
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user: req.session.user,
        error: 'Erro ao carregar dados do perfil',
        success: null
      });
    }
  }

  /**
   * Atualiza dados básicos do perfil (nome, email)
   */
  static async updateBasic(req, res) {
    const userId = req.session.user.id;
    const { nome, email } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const user = await User.findProfileById(userId);
      return res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: errors.array().map(e => e.msg).join(', '),
        success: null
      });
    }

    try {
      // Busca usuário atual para comparar email
      const userAtual = await User.findById(userId);
      const emailFoiAlterado = userAtual && userAtual.email.toLowerCase() !== email.toLowerCase();

      // Verifica se email já existe (exceto para o próprio usuário)
      const emailExistente = await User.findByEmail(email);
      if (emailExistente && emailExistente.id !== userId) {
        const user = await User.findProfileById(userId);
        return res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user,
          error: 'Este email já está em uso por outro usuário',
          success: null
        });
      }

      const updatedUser = await User.update(userId, { nome, email });
      
      if (updatedUser) {
        // Se email foi alterado, atualiza tokens pendentes do usuário
        if (emailFoiAlterado) {
          try {
            const tokensAtualizados = await PaymentToken.updateEmailByUserId(userId, email);
            
            if (tokensAtualizados > 0) {
              console.log('✅ Email atualizado - Tokens pendentes atualizados:', {
                user_id: userId,
                email_antigo: userAtual.email,
                email_novo: email,
                tokens_atualizados: tokensAtualizados
              });
            }
          } catch (tokenError) {
            // Não bloqueia atualização do perfil se houver erro ao atualizar tokens
            console.warn('⚠️ Aviso: Erro ao atualizar tokens pendentes após alteração de email:', tokenError.message);
          }
        }

        // Atualiza sessão
        req.session.user.nome = updatedUser.nome;
        req.session.user.email = updatedUser.email;
        
        const user = await User.findProfileById(userId);
        res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user,
          error: null,
          success: 'Dados básicos atualizados com sucesso!'
        });
      } else {
        const user = await User.findProfileById(userId);
        res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user,
          error: 'Erro ao atualizar dados',
          success: null
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      const user = await User.findProfileById(userId);
      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: 'Erro interno ao atualizar dados',
        success: null
      });
    }
  }

  /**
   * Atualiza dados adicionais do perfil
   */
  static async updateProfile(req, res) {
    const userId = req.session.user.id;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const user = await User.findProfileById(userId);
      return res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: errors.array().map(e => e.msg).join(', '),
        success: null
      });
    }

    const { telefone, whatsapp, empresa, cargo, observacoes, instagram } = req.body;

    try {
      // Sanitiza e prepara dados
      const profileData = {
        telefone: telefone ? telefone.trim() : null,
        whatsapp: whatsapp ? whatsapp.trim() : null,
        empresa: empresa ? empresa.trim() : null,
        cargo: cargo ? cargo.trim() : null,
        observacoes: observacoes ? observacoes.trim() : null,
        instagram: instagram ? instagram.trim().replace(/^@/, '') : null // Remove @ se presente
      };

      // Valida tamanho de observações
      if (profileData.observacoes && profileData.observacoes.length > 5000) {
        const user = await User.findProfileById(userId);
        return res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user,
          error: 'Observações muito longas (máximo 5000 caracteres)',
          success: null
        });
      }

      const updatedUser = await User.update(userId, profileData);
      
      if (updatedUser) {
        const user = await User.findProfileById(userId);
        res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user,
          error: null,
          success: 'Perfil atualizado com sucesso!'
        });
      } else {
        const user = await User.findProfileById(userId);
        res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user,
          error: 'Erro ao atualizar perfil',
          success: null
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      const user = await User.findProfileById(userId);
      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: 'Erro interno ao atualizar perfil',
        success: null
      });
    }
  }

  /**
   * Atualiza senha do usuário
   */
  static async updatePassword(req, res) {
    const userId = req.session.user.id;
    const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const user = await User.findProfileById(userId);
      return res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: errors.array().map(e => e.msg).join(', '),
        success: null
      });
    }

    if (novaSenha !== confirmarNovaSenha) {
      const user = await User.findProfileById(userId);
      return res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: 'As novas senhas não coincidem',
        success: null
      });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).render('error', {
          title: 'Erro',
          error: 'Usuário não encontrado'
        });
      }

      // Busca senha hash do banco
      const userWithPassword = await User.findByEmail(user.email);
      const senhaValida = await User.verifyPassword(senhaAtual, userWithPassword.senha_hash);

      if (!senhaValida) {
        const userProfile = await User.findProfileById(userId);
        return res.render('perfil/index', {
          title: 'Meu Perfil - Suporte DP',
          user: userProfile,
          error: 'Senha atual incorreta',
          success: null
        });
      }

      await User.update(userId, { senha: novaSenha });
      const userProfile = await User.findProfileById(userId);
      
      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user: userProfile,
        error: null,
        success: 'Senha atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      const user = await User.findProfileById(userId);
      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        error: 'Erro interno ao atualizar senha',
        success: null
      });
    }
  }
}

module.exports = PerfilController;
