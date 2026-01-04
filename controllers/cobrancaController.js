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
      
      try {
        // Se tiver order_nsu, tenta buscar a cobrança
        if (order_nsu) {
          cobranca = await Cobranca.findByExternalId(order_nsu);
          if (cobranca) {
            const User = require('../models/User');
            user = await User.findById(cobranca.user_id);
            
            // Verifica se usuário tem senha
            if (user) {
              try {
                const userWithPassword = await db.query(
                  'SELECT senha_hash FROM users WHERE id = $1',
                  [user.id]
                );
                userHasPassword = userWithPassword.rows[0]?.senha_hash && 
                                 userWithPassword.rows[0].senha_hash.length > 0;
                
                // Se não tem senha, gera token de cadastro
                if (!userHasPassword && user.email) {
                  try {
                    const linkCadastro = await cadastroService.gerarLinkCadastro(
                      user.email, 
                      user.nome || 'Cliente'
                    );
                    // Extrai o token da URL (formato: https://app.com/cadastro/TOKEN)
                    const tokenMatch = linkCadastro.match(/\/cadastro\/([^\/\?]+)/);
                    tokenCadastro = tokenMatch ? tokenMatch[1] : null;
                  } catch (tokenError) {
                    console.error('Erro ao gerar token de cadastro:', tokenError);
                    // Continua sem token - usuário pode usar o link do email
                  }
                }
              } catch (passwordError) {
                console.error('Erro ao verificar senha do usuário:', passwordError);
                // Continua sem verificar senha
              }
            }
          }
        }
      } catch (cobrancaError) {
        console.error('Erro ao buscar cobrança:', cobrancaError);
        // Continua sem cobrança - pode ser que o pagamento ainda não foi processado
      }
      
      // Se ainda não encontrou usuário, tenta buscar pela sessão
      if (!user && req.session?.user) {
        try {
          console.log('🔍 [Pagamento Sucesso] Buscando usuário pela sessão:', req.session.user.id);
          const User = require('../models/User');
          const userFull = await User.findById(req.session.user.id);
          if (userFull) {
            user = userFull;
            console.log('✅ [Pagamento Sucesso] Usuário encontrado pela sessão:', {
              id: user.id,
              email: user.email,
              nome: user.nome
            });
            
            // Verifica se tem senha
            try {
              const userWithPassword = await db.query(
                'SELECT senha_hash FROM users WHERE id = $1',
                [user.id]
              );
              userHasPassword = userWithPassword.rows[0]?.senha_hash && 
                               userWithPassword.rows[0].senha_hash.length > 0;
              
              console.log('🔍 [Pagamento Sucesso] Usuário da sessão tem senha?', userHasPassword);
              
              // Se não tem senha, gera token de cadastro
              if (!userHasPassword && user.email) {
                try {
                  console.log('🔑 [Pagamento Sucesso] Gerando token de cadastro para usuário da sessão:', user.email);
                  const linkCadastro = await cadastroService.gerarLinkCadastro(
                    user.email, 
                    user.nome || 'Cliente'
                  );
                  console.log('✅ [Pagamento Sucesso] Link de cadastro gerado:', linkCadastro.substring(0, 50) + '...');
                  
                  // Extrai o token da URL (formato: https://app.com/cadastro/TOKEN)
                  const tokenMatch = linkCadastro.match(/\/cadastro\/([^\/\?]+)/);
                  tokenCadastro = tokenMatch ? tokenMatch[1] : null;
                  
                  if (tokenCadastro) {
                    console.log('✅ [Pagamento Sucesso] Token extraído com sucesso');
                  } else {
                    console.error('❌ [Pagamento Sucesso] Não foi possível extrair token do link:', linkCadastro);
                  }
                } catch (tokenError) {
                  console.error('❌ [Pagamento Sucesso] Erro ao gerar token de cadastro:', tokenError);
                  console.error('Stack:', tokenError.stack);
                  // Continua sem token
                }
              } else if (!user.email) {
                console.warn('⚠️  [Pagamento Sucesso] Usuário da sessão não tem email, não é possível gerar token');
              }
            } catch (passwordError) {
              console.error('❌ [Pagamento Sucesso] Erro ao verificar senha do usuário da sessão:', passwordError);
              // Continua sem verificar senha
            }
          }
        } catch (userError) {
          console.error('❌ [Pagamento Sucesso] Erro ao buscar usuário da sessão:', userError);
          // Continua sem usuário
        }
      }
      
      // Se ainda não encontrou usuário e não tem order_nsu, tenta buscar última cobrança pendente
      // Isso pode acontecer se o InfinitePay não passar o order_nsu na URL
      if (!user && !order_nsu) {
        try {
          console.log('🔍 [Pagamento Sucesso] Tentando buscar última cobrança pendente recente...');
          const ultimaCobranca = await db.query(`
            SELECT c.*, u.id as user_id, u.nome, u.email
            FROM cobrancas c
            INNER JOIN users u ON u.id = c.user_id
            WHERE c.status = 'paga'
            AND c.data_pagamento >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
            ORDER BY c.data_pagamento DESC
            LIMIT 1
          `);
          
          if (ultimaCobranca.rows.length > 0) {
            const cobrancaRecente = ultimaCobranca.rows[0];
            cobranca = cobrancaRecente;
            user = {
              id: cobrancaRecente.user_id,
              nome: cobrancaRecente.nome,
              email: cobrancaRecente.email
            };
            
            console.log('✅ [Pagamento Sucesso] Cobrança recente encontrada:', {
              cobranca_id: cobranca.id,
              user_id: user.id,
              email: user.email
            });
            
            // Verifica se tem senha e gera token se necessário
            if (user.email) {
              try {
                const userWithPassword = await db.query(
                  'SELECT senha_hash FROM users WHERE id = $1',
                  [user.id]
                );
                userHasPassword = userWithPassword.rows[0]?.senha_hash && 
                                 userWithPassword.rows[0].senha_hash.length > 0;
                
                if (!userHasPassword) {
                  const linkCadastro = await cadastroService.gerarLinkCadastro(
                    user.email, 
                    user.nome || 'Cliente'
                  );
                  const tokenMatch = linkCadastro.match(/\/cadastro\/([^\/\?]+)/);
                  tokenCadastro = tokenMatch ? tokenMatch[1] : null;
                  console.log('✅ [Pagamento Sucesso] Token gerado para cobrança recente');
                }
              } catch (error) {
                console.error('❌ [Pagamento Sucesso] Erro ao processar usuário da cobrança recente:', error);
              }
            }
          }
        } catch (error) {
          console.error('❌ [Pagamento Sucesso] Erro ao buscar cobrança recente:', error);
        }
      }
      
      // Log para debug
      console.log('📋 [Pagamento Sucesso] Dados para renderização:', {
        temOrderNsu: !!order_nsu,
        orderNsu: order_nsu,
        temCobranca: !!cobranca,
        temUser: !!user,
        userEmail: user?.email,
        userHasPassword: userHasPassword,
        temTokenCadastro: !!tokenCadastro,
        tokenCadastro: tokenCadastro ? tokenCadastro.substring(0, 20) + '...' : null
      });

      // Garante valores padrão para evitar erros na view
      res.render('cobranca/pagamento-sucesso', {
        title: 'Pagamento Confirmado - Suporte DP',
        user: user || { nome: 'Cliente', email: '' },
        cobranca: cobranca || null,
        userHasPassword: userHasPassword || false,
        tokenCadastro: tokenCadastro || null
      });
    } catch (error) {
      console.error('❌ Erro ao carregar página de sucesso de pagamento:', error);
      console.error('Stack:', error.stack);
      
      // Renderiza página de erro amigável (fallback se não tiver view de erro)
      try {
        res.status(500).render('error', {
          title: 'Erro - Suporte DP',
          message: 'Erro ao carregar página de sucesso de pagamento',
          error: process.env.NODE_ENV === 'development' ? error : null
        });
      } catch (renderError) {
        // Se não tiver view de erro, renderiza página simples
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro - Suporte DP</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; max-width: 600px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Erro ao carregar página</h1>
              <p>Ocorreu um erro ao processar sua solicitação.</p>
              <p><a href="/">Voltar ao início</a></p>
            </div>
          </body>
          </html>
        `);
      }
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

