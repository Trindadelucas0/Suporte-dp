/**
 * MIDDLEWARE DE AUTENTICAÇÃO
 * Protege rotas que requerem login
 */

const { checkInactivity } = require('./activityTracker');
const User = require('../models/User');
const Cobranca = require('../models/Cobranca');
const db = require('../config/database');

async function verificarStatusUsuario(req, res, next) {
  // Verifica se o usuário ainda está ativo e não bloqueado
  if (req.session && req.session.user && req.session.user.id) {
    try {
      const user = await User.findById(req.session.user.id);
      
      if (!user) {
        // Usuário não existe mais
        console.log('⚠️ [AUTH] Usuário não encontrado no banco:', req.session.user.id);
        req.session.destroy(() => {
          if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({ 
              error: 'Usuário não encontrado',
              redirect: '/login?error=usuario_nao_encontrado'
            });
          }
          res.redirect('/login?error=usuario_nao_encontrado');
        });
        return;
      }

      // Verifica se está bloqueado ou desativado
      if (user.bloqueado === true || user.ativo === false) {
        console.log('⚠️ [AUTH] Usuário bloqueado ou desativado:', {
          id: user.id,
          nome: user.nome,
          bloqueado: user.bloqueado,
          ativo: user.ativo
        });
        // Destrói a sessão e redireciona
        req.session.destroy(() => {
          if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({ 
              error: 'Conta bloqueada ou desativada',
              redirect: '/login?error=conta_bloqueada'
            });
          }
          res.redirect('/login?error=conta_bloqueada');
        });
        return;
      }

      // Verifica se está bloqueado por pagamento
      if (user.bloqueado_pagamento === true) {
        console.log('⚠️ [AUTH] Usuário bloqueado por pagamento:', {
          id: user.id,
          nome: user.nome
        });
        // Redireciona para página de bloqueio (não destrói sessão para mostrar dados)
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(403).json({ 
            error: 'Acesso bloqueado por falta de pagamento',
            redirect: '/cobranca/blocked'
          });
        }
        res.redirect('/cobranca/blocked');
        return;
      }

      // VERIFICA SE TEM PAGAMENTO CONFIRMADO (OBRIGATÓRIO)
      // Admin pode acessar sem pagamento
      if (!user.is_admin) {
        const temPagamento = await verificarPagamentoConfirmado(user.id);
        if (!temPagamento) {
          console.log('⚠️ [AUTH] Usuário sem pagamento confirmado:', {
            id: user.id,
            nome: user.nome,
            rota: req.path
          });
          
          // Permite acesso apenas a rotas de cobrança/assinatura/cadastro
          const rotasPermitidas = [
            '/cobranca/assinar',
            '/cobranca/assinar/redirect',
            '/cobranca/blocked',
            '/cobranca/pagamento-sucesso',
            '/cobranca/ativacao-sucesso',
            '/cobranca/pagar/',
            '/cadastro/',
            '/logout'
          ];
          
          const rotaAtual = req.path;
          const podeAcessar = rotasPermitidas.some(rota => rotaAtual.startsWith(rota));
          
          if (!podeAcessar) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
              return res.status(403).json({ 
                error: 'É necessário assinar o plano e concluir o pagamento para acessar o sistema',
                redirect: '/cobranca/assinar'
              });
            }
            res.redirect('/cobranca/assinar');
            return;
          }
        }
      }
    } catch (error) {
      console.error('❌ [AUTH] Erro ao verificar status do usuário:', error);
      // Em caso de erro, permite continuar (não bloqueia o acesso)
      // Mas loga o erro para investigação
    }
  }
  
  return next();
}

function requireAuth(req, res, next) {
  // Verifica se está autenticado primeiro
  if (!req.session || !req.session.user) {
    if (req.session) {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/login');
  }

  // Depois verifica inatividade (10 minutos)
  const canContinue = checkInactivity(req, res);
  if (canContinue === false) {
    return; // Sessão expirada, já redirecionou
  }

  // Verifica status do usuário (ativo/bloqueado) - assíncrono
  return verificarStatusUsuario(req, res, next);
}

function requireAdmin(req, res, next) {
  // Verifica se está autenticado primeiro
  if (!req.session || !req.session.user) {
    if (req.session) {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/login');
  }

  // Verifica inatividade (10 minutos)
  const canContinue = checkInactivity(req, res);
  if (canContinue === false) {
    return; // Sessão expirada, já redirecionou
  }

  // Verifica status do usuário (ativo/bloqueado) - assíncrono
  return verificarStatusUsuario(req, res, () => {
    // Verifica se é admin
    if (req.session.user.is_admin) {
      return next();
    }
    
    res.status(403).render('error', {
      title: 'Acesso Negado',
      error: 'Você não tem permissão para acessar esta página.'
    });
  });
}

/**
 * Verifica se usuário tem pagamento confirmado
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} true se tem pagamento confirmado
 */
async function verificarPagamentoConfirmado(userId) {
  try {
    // Busca cobrança paga nos últimos 35 dias (dá margem para pagamento mensal)
    const result = await db.query(
      `SELECT COUNT(*) as total
       FROM cobrancas
       WHERE user_id = $1
       AND status = 'paga'
       AND data_pagamento >= CURRENT_DATE - INTERVAL '35 days'`,
      [userId]
    );

    const total = parseInt(result.rows[0]?.total || 0);
    return total > 0;
  } catch (error) {
    console.error('❌ [AUTH] Erro ao verificar pagamento:', error);
    // Em caso de erro, permite acesso (não bloqueia)
    return true;
  }
}

module.exports = {
  requireAuth,
  requireAdmin
};

