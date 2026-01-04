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
   * Página de sucesso de pagamento (pública - acessível após pagamento no InfinitePay)
   */
  static async pagamentoSucesso(req, res) {
    try {
      const db = require('../config/database');
      const cadastroService = require('../services/cadastroService');
      
      // Tenta buscar informações da cobrança pelos parâmetros da URL (se vier do InfinitePay)
      const { order_nsu, slug, transaction_nsu } = req.query;
      
      let cobranca = null;
      let user = null;
      let userHasPassword = false;
      let tokenCadastro = null;
      
      // Se tiver order_nsu, tenta buscar a cobrança
      if (order_nsu) {
        cobranca = await Cobranca.findByExternalId(order_nsu);
        if (cobranca) {
          const User = require('../models/User');
          user = await User.findById(cobranca.user_id);
          
          // Verifica se usuário tem senha
          if (user) {
            const userWithPassword = await db.query(
              'SELECT senha_hash FROM users WHERE id = $1',
              [user.id]
            );
            userHasPassword = userWithPassword.rows[0]?.senha_hash && 
                             userWithPassword.rows[0].senha_hash.length > 0;
            
            // Se não tem senha, gera token de cadastro
            if (!userHasPassword) {
              // Busca ou cria token de cadastro
              const linkCadastro = await cadastroService.gerarLinkCadastro(
                user.email, 
                user.nome || 'Cliente'
              );
              // Extrai o token da URL (formato: https://app.com/cadastro/TOKEN)
              const tokenMatch = linkCadastro.match(/\/cadastro\/([^\/\?]+)/);
              tokenCadastro = tokenMatch ? tokenMatch[1] : null;
            }
          }
        }
      }
      
      // Se o usuário estiver logado, usa os dados da sessão
      if (req.session?.user) {
        const User = require('../models/User');
        const userFull = await User.findById(req.session.user.id);
        if (userFull) {
          user = userFull;
          // Verifica se tem senha
          const userWithPassword = await db.query(
            'SELECT senha_hash FROM users WHERE id = $1',
            [user.id]
          );
          userHasPassword = userWithPassword.rows[0]?.senha_hash && 
                           userWithPassword.rows[0].senha_hash.length > 0;
          
          // Se não tem senha, gera token de cadastro
          if (!userHasPassword) {
            const linkCadastro = await cadastroService.gerarLinkCadastro(
              user.email, 
              user.nome || 'Cliente'
            );
            // Extrai o token da URL (formato: https://app.com/cadastro/TOKEN)
            const tokenMatch = linkCadastro.match(/\/cadastro\/([^\/\?]+)/);
            tokenCadastro = tokenMatch ? tokenMatch[1] : null;
          }
        }
      }
      
      res.render('cobranca/pagamento-sucesso', {
        title: 'Pagamento Confirmado - Suporte DP',
        user: user || { nome: 'Cliente', email: '' },
        cobranca: cobranca,
        userHasPassword: userHasPassword,
        tokenCadastro: tokenCadastro
      });
    } catch (error) {
      console.error('Erro ao carregar página de sucesso:', error);
      res.render('cobranca/pagamento-sucesso', {
        title: 'Pagamento Confirmado - Suporte DP',
        user: req.session?.user || { nome: 'Cliente' },
        cobranca: null
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
      // Salva a URL de retorno para redirecionar após login
      if (req.session) {
        req.session.returnTo = '/cobranca/assinar';
      }
      return res.redirect('/login?redirect=assinatura');
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

      // Se já tem cobrança ativa, usa o link existente
      let planLink = null;
      if (cobrancaAtiva && cobrancaAtiva.link_pagamento) {
        planLink = cobrancaAtiva.link_pagamento;
      }

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
   * Assinatura direta (sem login) - para landing page
   * Cria usuário temporário e redireciona para InfinitePay
   */
  static async assinarDireto(req, res) {
    // Garante que sempre retorna JSON
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { email, nome, telefone } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email é obrigatório'
        });
      }

      const assinaturaService = require('../services/assinaturaService');
      const resultado = await assinaturaService.criarAssinaturaDireta({
        email: email.trim(),
        nome: nome?.trim() || '',
        telefone: telefone?.trim() || ''
      });

      if (resultado.success && resultado.link_pagamento) {
        return res.json({
          success: true,
          link_pagamento: resultado.link_pagamento,
          redirect: true
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Não foi possível gerar link de pagamento'
        });
      }
    } catch (error) {
      console.error('Erro ao criar assinatura direta:', error);
      console.error('Stack:', error.stack);
      
      // Garante que sempre retorna JSON, mesmo em caso de erro
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar assinatura'
      });
    }
  }

  /**
   * Redireciona para link do InfinitePay (cria cobrança via API REST)
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

      // Verifica se já tem cobrança ativa
      const cobrancas = await Cobranca.findByUserId(userId);
      const cobrancaAtiva = cobrancas.find(c => c.status === 'pendente' || c.status === 'vencida');
      
      // Se já tem cobrança ativa, usa o link existente
      if (cobrancaAtiva && cobrancaAtiva.link_pagamento) {
        return res.redirect(cobrancaAtiva.link_pagamento);
      }

      // Cria nova cobrança via API REST
      const cobrancaService = require('../services/cobrancaService');
      const cobranca = await cobrancaService.gerarCobrancaMensal(userId);

      console.log('📋 Cobrança criada:', {
        id: cobranca?.id,
        external_id: cobranca?.external_id,
        link_pagamento: cobranca?.link_pagamento ? 'Existe' : 'NÃO EXISTE',
        status: cobranca?.status
      });

      if (cobranca && cobranca.link_pagamento) {
        // Redireciona para o link do InfinitePay
        console.log('✅ Redirecionando para:', cobranca.link_pagamento);
        return res.redirect(cobranca.link_pagamento);
      } else {
        console.error('❌ Link de pagamento não gerado:', {
          cobranca: cobranca ? 'Existe' : 'Não existe',
          link_pagamento: cobranca?.link_pagamento || 'null/undefined'
        });
        throw new Error(`Não foi possível gerar link de pagamento. Status: ${cobranca?.status || 'N/A'}, Link: ${cobranca?.link_pagamento || 'null'}`);
      }
    } catch (error) {
      console.error('❌ Erro ao redirecionar para assinatura:', error);
      console.error('Stack:', error.stack);
      res.render('error', {
        title: 'Erro - Suporte DP',
        error: `Erro ao redirecionar para página de pagamento: ${error.message}. Verifique se o InfinitePay está configurado corretamente.`
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

