/**
 * MIDDLEWARE DE AUTENTICAÇÃO
 * Protege rotas que requerem login
 */

const { checkInactivity } = require('./activityTracker');

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

  return next();
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

  // Verifica se é admin
  if (req.session.user.is_admin) {
    return next();
  }
  
  res.status(403).render('error', {
    title: 'Acesso Negado',
    error: 'Você não tem permissão para acessar esta página.'
  });
}

module.exports = {
  requireAuth,
  requireAdmin
};

