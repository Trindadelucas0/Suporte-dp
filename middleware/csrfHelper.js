/**
 * Helper para CSRF Token
 * Disponibiliza token CSRF nas views
 */

module.exports = (req, res, next) => {
  // Tenta gerar token CSRF se sessão existir
  if (req.session && req.session.user) {
    try {
      res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
    } catch (error) {
      // Se não conseguir gerar token, define como null
      res.locals.csrfToken = null;
    }
  } else {
    res.locals.csrfToken = null;
  }
  next();
};


