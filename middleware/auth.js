/**
 * MIDDLEWARE DE AUTENTICAÇÃO
 * Protege rotas que requerem login
 */

const { checkInactivity } = require('./activityTracker');
const User = require('../models/User');

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
    } catch (error) {
      console.error('❌ [AUTH] Erro ao verificar status do usuário:', error);
      // Em caso de erro, permite continuar (não bloqueia o acesso)
      // Mas loga o erro para investigação
    }
  }
  
  return next();
}

/**
 * Middleware para verificar se usuário tem assinatura ativa
 * - ADMIN: Sempre permite acesso (sem verificação de assinatura)
 * - CLIENTES: Precisam ter assinatura ativa, senão redireciona para /renovar
 * Permite acesso a /renovar mesmo com assinatura expirada
 */
async function requireActiveSubscription(req, res, next) {
  // Se está tentando acessar /renovar, permite (mesmo com assinatura expirada)
  if (req.path === '/renovar' || req.path.startsWith('/renovar')) {
    return next();
  }

  // Verifica se está autenticado
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

  try {
    const user = await User.findById(req.session.user.id);
    
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    // ADMIN: Sempre permite acesso (sem verificação de assinatura)
    if (user.is_admin === true) {
      console.log('✅ [AUTH] Admin acessando - permite sem verificação de assinatura:', {
        user_id: user.id,
        nome: user.nome
      });
      return next();
    }

    // CLIENTE: Verifica se assinatura está ativa
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let dataExpiracao = null;
    if (user.subscription_expires_at) {
      dataExpiracao = new Date(user.subscription_expires_at);
      dataExpiracao.setHours(0, 0, 0, 0);
    }

    const assinaturaExpirada = dataExpiracao && dataExpiracao < hoje;
    const assinaturaInadimplente = user.subscription_status === 'inadimplente';

    if (assinaturaExpirada || assinaturaInadimplente) {
      // Assinatura expirada - redireciona para renovação
      console.log('⚠️ [AUTH] Cliente com assinatura expirada/inadimplente - redirecionando para renovação:', {
        user_id: user.id,
        nome: user.nome,
        expires_at: user.subscription_expires_at,
        status: user.subscription_status
      });
      return res.redirect('/renovar');
    }

    // Assinatura ativa - permite acesso
    return next();
  } catch (error) {
    console.error('❌ [AUTH] Erro ao verificar assinatura:', error);
    // Em caso de erro, bloqueia acesso (segurança)
    req.session.destroy();
    return res.redirect('/login?error=erro_verificacao');
  }
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

module.exports = {
  requireAuth,
  requireAdmin,
  requireActiveSubscription
};

