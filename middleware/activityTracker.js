/**
 * MIDDLEWARE: Activity Tracker
 * Rastreia última atividade do usuário para identificar usuários online
 */

const db = require('../config/database');

/**
 * Atualiza a última atividade do usuário logado
 */
async function trackActivity(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    try {
      // Atualiza última atividade (não bloqueia a requisição)
      db.query(
        'UPDATE users SET ultima_atividade = CURRENT_TIMESTAMP WHERE id = $1',
        [req.session.user.id]
      ).catch(err => {
        // Ignora erros silenciosamente para não bloquear requisições
        console.warn('Erro ao atualizar última atividade:', err.message);
      });
    } catch (error) {
      // Ignora erros
    }
  }
  next();
}

module.exports = trackActivity;

