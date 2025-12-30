/**
 * CONTROLLER: PerfilController
 * Gerencia perfil do usuário (Perfil, Configurações, Sugestões & Bugs)
 */

const User = require('../models/User');
const SugestaoBug = require('../models/SugestaoBug');
const { validationResult } = require('express-validator');

class PerfilController {
  /**
   * Exibe página de perfil do usuário
   */
  static async index(req, res) {
    const userId = req.session.user.id;
    const aba = req.query.aba || 'perfil';

    try {
      const user = await User.findById(userId);
      let sugestoes = [];

      if (aba === 'sugestoes') {
        sugestoes = await SugestaoBug.findByUserId(userId);
      }

      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user,
        aba,
        sugestoes
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      res.render('perfil/index', {
        title: 'Meu Perfil - Suporte DP',
        user: req.session.user,
        aba: 'perfil',
        sugestoes: [],
        error: 'Erro ao carregar dados do perfil'
      });
    }
  }

  /**
   * Atualiza dados do perfil
   */
  static async update(req, res) {
    const userId = req.session.user.id;
    const { nome, email } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json({ success: false, error: 'Dados inválidos' });
    }

    try {
      // Verifica se email já está em uso por outro usuário
      const userExistente = await User.findByEmail(email);
      if (userExistente && userExistente.id !== userId) {
        return res.json({ success: false, error: 'Este email já está em uso' });
      }

      const user = await User.update(userId, { nome, email });
      
      // Atualiza sessão
      req.session.user.nome = user.nome;
      req.session.user.email = user.email;

      res.json({ success: true, user });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.json({ success: false, error: 'Erro ao atualizar perfil' });
    }
  }

  /**
   * Atualiza senha
   */
  static async updatePassword(req, res) {
    const userId = req.session.user.id;
    const { senhaAtual, novaSenha, confirmarSenha } = req.body;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return res.json({ success: false, error: 'Todos os campos são obrigatórios' });
    }

    if (novaSenha.length < 6) {
      return res.json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    if (novaSenha !== confirmarSenha) {
      return res.json({ success: false, error: 'As senhas não coincidem' });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.json({ success: false, error: 'Usuário não encontrado' });
      }

      // Busca senha hash completa
      const userCompleto = await User.findByEmail(user.email);
      const senhaValida = await User.verifyPassword(senhaAtual, userCompleto.senha_hash);
      
      if (!senhaValida) {
        return res.json({ success: false, error: 'Senha atual incorreta' });
      }

      await User.update(userId, { senha: novaSenha });
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      res.json({ success: false, error: 'Erro ao atualizar senha' });
    }
  }

  /**
   * Cria sugestão ou bug
   */
  static async criarSugestaoBug(req, res) {
    const userId = req.session.user.id;
    const { tipo, titulo, descricao } = req.body;

    if (!tipo || !titulo || !descricao) {
      return res.json({ success: false, error: 'Todos os campos são obrigatórios' });
    }

    if (!['sugestao', 'bug'].includes(tipo)) {
      return res.json({ success: false, error: 'Tipo inválido' });
    }

    try {
      const sugestao = await SugestaoBug.create(userId, tipo, titulo, descricao);
      res.json({ success: true, data: sugestao });
    } catch (error) {
      console.error('Erro ao criar sugestão/bug:', error);
      res.json({ success: false, error: 'Erro ao enviar sugestão/bug' });
    }
  }
}

module.exports = PerfilController;

