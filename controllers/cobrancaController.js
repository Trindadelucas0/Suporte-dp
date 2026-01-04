/**
 * CONTROLLER: CobrancaController
 * Gerencia endpoints de cobrança
 */

const cobrancaService = require('../services/cobrancaService');
const bloqueioService = require('../services/bloqueioService');
const Cobranca = require('../models/Cobranca');
const User = require('../models/User');

class CobrancaController {
  /**
   * Exibe página de bloqueio
   */
  static async blocked(req, res) {
    const userId = req.session.user?.id;
    
    if (!userId) {
      return res.redirect('/login');
    }

    try {
      const user = await User.findById(userId);
      if (!user || !user.bloqueado_pagamento) {
        return res.redirect('/dashboard');
      }

      // Busca última cobrança pendente
      const cobrancas = await Cobranca.findByUserId(userId);
      const cobrancaPendente = cobrancas.find(c => c.status === 'pendente' || c.status === 'vencida');

      res.render('cobranca/blocked', {
        title: 'Acesso Bloqueado - Suporte DP',
        user: req.session.user,
        cobranca: cobrancaPendente,
        appName: process.env.APP_NAME || 'Suporte DP'
      });
    } catch (error) {
      console.error('Erro ao carregar página de bloqueio:', error);
      res.render('cobranca/blocked', {
        title: 'Acesso Bloqueado - Suporte DP',
        user: req.session.user,
        cobranca: null,
        error: 'Erro ao carregar informações'
      });
    }
  }

  /**
   * Ativa conta via link de ativação
   */
  static async ativar(req, res) {
    const { token } = req.params;

    try {
      const resultado = await bloqueioService.validarLinkAtivacao(token);

      if (!resultado.success) {
        return res.render('error', {
          title: 'Erro - Suporte DP',
          error: resultado.error || 'Link inválido ou expirado'
        });
      }

      // Faz login automático
      const user = await User.findById(resultado.userId);
      if (user) {
        req.session.user = {
          id: user.id,
          nome: user.nome,
          email: user.email,
          is_admin: user.is_admin
        };
        req.session.lastActivity = Date.now();
      }

      res.render('cobranca/ativacao-sucesso', {
        title: 'Conta Ativada - Suporte DP',
        user: req.session.user
      });
    } catch (error) {
      console.error('Erro ao ativar conta:', error);
      res.render('error', {
        title: 'Erro - Suporte DP',
        error: 'Erro ao ativar conta. Tente novamente.'
      });
    }
  }

  /**
   * Exibe link de pagamento
   */
  static async pagar(req, res) {
    const userId = req.session.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.redirect('/login');
    }

    try {
      const cobranca = await Cobranca.findById(id);

      if (!cobranca || cobranca.user_id !== userId) {
        return res.render('error', {
          title: 'Erro - Suporte DP',
          error: 'Cobrança não encontrada'
        });
      }

      if (cobranca.status === 'paga') {
        return res.render('cobranca/pagamento-sucesso', {
          title: 'Pagamento Confirmado - Suporte DP',
          user: req.session.user,
          cobranca: cobranca
        });
      }

      res.render('cobranca/pagar', {
        title: 'Pagar Mensalidade - Suporte DP',
        user: req.session.user,
        cobranca: cobranca
      });
    } catch (error) {
      console.error('Erro ao carregar página de pagamento:', error);
      res.render('error', {
        title: 'Erro - Suporte DP',
        error: 'Erro ao carregar informações de pagamento'
      });
    }
  }

  /**
   * Lista cobranças do usuário (API)
   */
  static async listar(req, res) {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    try {
      const cobrancas = await Cobranca.findByUserId(userId);
      res.json({
        success: true,
        data: cobrancas
      });
    } catch (error) {
      console.error('Erro ao listar cobranças:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar cobranças'
      });
    }
  }

  /**
   * Página de assinatura do plano
   */
  static async assinar(req, res) {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.redirect('/login');
      }

      // Busca se já tem cobrança ativa
      const cobrancas = await Cobranca.findByUserId(userId);
      const cobrancaAtiva = cobrancas.find(c => c.status === 'pendente' || c.status === 'vencida');
      const cobrancaPaga = cobrancas.find(c => c.status === 'paga');

      // Gera link do plano InfinitePay
      const InfinitePayProvider = require('../providers/infinitepay.provider');
      const planLink = InfinitePayProvider.getPlanLink(
        user.email,
        user.nome,
        `user_${userId}_${new Date().toISOString().split('T')[0]}`
      );

      res.render('cobranca/assinar', {
        title: 'Assinar Plano - Suporte DP',
        user: req.session.user,
        cobrancaAtiva: cobrancaAtiva,
        cobrancaPaga: cobrancaPaga,
        planLink: planLink,
        valorMensalidade: parseFloat(process.env.VALOR_MENSALIDADE || 19.90),
        appName: process.env.APP_NAME || 'Suporte DP'
      });
    } catch (error) {
      console.error('Erro ao carregar página de assinatura:', error);
      res.render('error', {
        title: 'Erro - Suporte DP',
        error: 'Erro ao carregar página de assinatura'
      });
    }
  }

  /**
   * Redireciona para link do InfinitePay
   */
  static async redirecionarAssinatura(req, res) {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.redirect('/login');
      }

      // Gera link do plano InfinitePay
      const InfinitePayProvider = require('../providers/infinitepay.provider');
      const planLink = InfinitePayProvider.getPlanLink(
        user.email,
        user.nome,
        `user_${userId}_${new Date().toISOString().split('T')[0]}`
      );

      // Redireciona para o InfinitePay
      res.redirect(planLink);
    } catch (error) {
      console.error('Erro ao redirecionar para assinatura:', error);
      res.render('error', {
        title: 'Erro - Suporte DP',
        error: 'Erro ao redirecionar para página de pagamento'
      });
    }
  }

  /**
   * Gera nova cobrança manualmente (Admin)
   */
  static async gerarCobranca(req, res) {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    // Verifica se é admin
    if (!req.session.user?.is_admin) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const { userId: targetUserId } = req.body;

    try {
      const cobranca = await cobrancaService.gerarCobrancaMensal(targetUserId);
      res.json({
        success: true,
        data: cobranca
      });
    } catch (error) {
      console.error('Erro ao gerar cobrança:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = CobrancaController;

