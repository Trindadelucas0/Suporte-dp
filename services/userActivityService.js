/**
 * SERVICE: User Activity Service
 * Gerencia lógica de usuários online/offline baseado em sessões e última atividade
 */

const db = require('../config/database');

class UserActivityService {
  /**
   * Busca usuários online (com sessão ativa nos últimos 5 minutos)
   */
  static async getOnlineUsers() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Primeiro, busca sessões ativas (não expiradas)
      const sessionsResult = await db.query(`
        SELECT sess, expire
        FROM sessions
        WHERE expire > NOW()
      `);

      // Extrai IDs de usuários das sessões
      const userIdsFromSessions = new Set();
      
      for (const row of sessionsResult.rows) {
        try {
          // Parse do JSON (pode ser string ou objeto)
          const sessionData = typeof row.sess === 'string' 
            ? JSON.parse(row.sess) 
            : row.sess;
          
          // Tenta extrair o ID do usuário da sessão
          // Formato pode ser: { user: { id: ... } } ou { passport: { user: ... } }
          const user = sessionData?.user || sessionData?.passport?.user;
          if (user && user.id) {
            userIdsFromSessions.add(user.id);
          }
        } catch (err) {
          // Ignora sessões com JSON inválido
          continue;
        }
      }

      // Busca usuários que estão online por:
      // 1. Última atividade recente (últimos 5 minutos)
      // 2. OU têm sessão ativa
      const userIdsArray = Array.from(userIdsFromSessions);
      
      let result;
      if (userIdsArray.length > 0) {
        // Busca usuários com última atividade OU com sessão ativa
        // Usa COALESCE para lidar com campos que podem não existir
        result = await db.query(`
          SELECT 
            id,
            nome,
            email,
            is_admin,
            ultima_atividade
          FROM users
          WHERE 
            (
              (ultima_atividade IS NOT NULL AND ultima_atividade > $1)
              OR id = ANY($2::uuid[])
            )
          ORDER BY ultima_atividade DESC NULLS LAST
        `, [fiveMinutesAgo, userIdsArray]);
      } else {
        // Se não há sessões, busca apenas por última atividade
        result = await db.query(`
          SELECT 
            id,
            nome,
            email,
            is_admin,
            ultima_atividade
          FROM users
          WHERE 
            ultima_atividade IS NOT NULL 
            AND ultima_atividade > $1
          ORDER BY ultima_atividade DESC
        `, [fiveMinutesAgo]);
      }

      // Remove duplicatas e formata resultado
      const onlineUsers = [];
      const seenIds = new Set();

      for (const row of result.rows) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);

        onlineUsers.push({
          id: row.id,
          nome: row.nome,
          email: row.email,
          is_admin: row.is_admin,
          ultima_atividade: row.ultima_atividade,
          tipo: row.is_admin ? 'admin' : 'usuário'
        });
      }

      return onlineUsers;
    } catch (error) {
      console.error('Erro ao buscar usuários online:', error);
      // Fallback: busca por última atividade
      return this.getOnlineUsersByActivity();
    }
  }

  /**
   * Busca usuários online baseado apenas em última atividade (fallback)
   */
  static async getOnlineUsersByActivity() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Query que funciona mesmo se campos ativo/bloqueado não existirem
      const result = await db.query(`
        SELECT 
          id,
          nome,
          email,
          is_admin,
          ultima_atividade
        FROM users
        WHERE ultima_atividade IS NOT NULL 
          AND ultima_atividade > $1
        ORDER BY ultima_atividade DESC
      `, [fiveMinutesAgo]);

      return result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        email: row.email,
        is_admin: row.is_admin,
        ultima_atividade: row.ultima_atividade,
        tipo: row.is_admin ? 'admin' : 'usuário'
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários online por atividade:', error);
      return [];
    }
  }

  /**
   * Busca usuários offline (não estão online)
   */
  static async getOfflineUsers() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const result = await db.query(`
        SELECT 
          id,
          nome,
          email,
          is_admin,
          last_login,
          ativo,
          bloqueado
        FROM users
        WHERE 
          (ultima_atividade IS NULL OR ultima_atividade <= $1)
          OR (ultima_atividade IS NULL AND last_login IS NOT NULL)
        ORDER BY last_login DESC NULLS LAST, created_at DESC
      `, [fiveMinutesAgo]);

      return result.rows.map(row => ({
        id: row.id,
        nome: row.nome,
        email: row.email,
        is_admin: row.is_admin,
        last_login: row.last_login,
        status: row.bloqueado ? 'bloqueada' : (row.ativo === false ? 'inativa' : 'ativa')
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários offline:', error);
      return [];
    }
  }
}

module.exports = UserActivityService;

