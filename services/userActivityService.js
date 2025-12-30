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
      // Busca sessões ativas (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const result = await db.query(`
        SELECT DISTINCT
          u.id,
          u.nome,
          u.email,
          u.is_admin,
          u.ultima_atividade,
          s.sess AS session_data
        FROM users u
        INNER JOIN sessions s ON s.sess::jsonb->>'user' IS NOT NULL
        WHERE 
          (u.ultima_atividade IS NOT NULL AND u.ultima_atividade > $1)
          OR (s.expire > NOW())
        ORDER BY u.ultima_atividade DESC NULLS LAST
      `, [fiveMinutesAgo]);

      // Processa sessões para extrair dados do usuário
      const onlineUsers = [];
      const userIds = new Set();

      for (const row of result.rows) {
        if (userIds.has(row.id)) continue;
        userIds.add(row.id);

        try {
          let userData = null;
          if (row.session_data) {
            const sessionObj = typeof row.session_data === 'string' 
              ? JSON.parse(row.session_data) 
              : row.session_data;
            userData = sessionObj.user || sessionObj.passport?.user;
          }

          onlineUsers.push({
            id: row.id,
            nome: row.nome,
            email: row.email,
            is_admin: row.is_admin,
            ultima_atividade: row.ultima_atividade,
            tipo: row.is_admin ? 'admin' : 'usuário'
          });
        } catch (err) {
          // Se não conseguir parsear sessão, usa dados diretos do user
          onlineUsers.push({
            id: row.id,
            nome: row.nome,
            email: row.email,
            is_admin: row.is_admin,
            ultima_atividade: row.ultima_atividade,
            tipo: row.is_admin ? 'admin' : 'usuário'
          });
        }
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
          AND ativo = true
          AND (bloqueado IS NULL OR bloqueado = false)
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

