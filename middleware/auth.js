/**
 * MIDDLEWARE DE AUTENTICAÇÃO
 * Protege rotas que requerem login
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.is_admin) {
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

