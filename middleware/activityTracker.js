/**
 * MIDDLEWARE: Activity Tracker
 * Rastreia última atividade do usuário para identificar usuários online
 * E controla timeout de inatividade (10 minutos)
 */

const db = require('../config/database');

// Timeout de inatividade: 10 minutos em milissegundos
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos

/**
 * Middleware para verificar timeout de inatividade
 * Redireciona para login se inativo por mais de 10 minutos
 * Retorna false se sessão expirou (e já redirecionou), true caso contrário
 */
function checkInactivity(req, res) {
  // Apenas verifica se há sessão e usuário
  if (req.session && req.session.user) {
    const now = Date.now();
    
    // Se lastActivity não existe, inicializa com o momento atual
    if (!req.session.lastActivity) {
      req.session.lastActivity = now;
      return true; // Primeira vez, pode continuar
    }
    
    const lastActivity = req.session.lastActivity;
    const timeSinceLastActivity = now - lastActivity;

    // Se passou mais de 10 minutos desde a última atividade
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
      console.log(`Sessão expirou por inatividade. Tempo: ${Math.round(timeSinceLastActivity / 1000)} segundos`);
      // Destrói a sessão e redireciona para login
      req.session.destroy((err) => {
        if (err) {
          console.error('Erro ao destruir sessão por inatividade:', err);
        }
        // Para requisições AJAX, retorna JSON
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(401).json({ 
            error: 'Sessão expirada por inatividade',
            redirect: '/login'
          });
        }
        // Para requisições normais, redireciona
        res.redirect('/login?expired=true');
      });
      return false; // Indica que não deve continuar (sessão expirou)
    }
    
    // Se não expirou, atualiza timestamp da última atividade
    req.session.lastActivity = now;
  }
  
  return true; // Indica que pode continuar (não expirou)
}

/**
 * Atualiza a última atividade do usuário logado
 */
async function trackActivity(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    try {
      // Atualiza última atividade no banco (não bloqueia a requisição)
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
module.exports.checkInactivity = checkInactivity;

