/**
 * SERVICE: AssinaturaNotificacaoService
 * Gerencia notificações sobre vencimento de assinaturas
 */

const db = require('../config/database');

class AssinaturaNotificacaoService {
  /**
   * Verifica e cria notificações para assinaturas prestes a vencer
   * @param {string} userId - ID do usuário (opcional, se não fornecido verifica todos)
   */
  static async verificarEVincularNotificacoes(userId = null) {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Calcula datas de alerta
      const em7Dias = new Date(hoje);
      em7Dias.setDate(em7Dias.getDate() + 7);

      const em3Dias = new Date(hoje);
      em3Dias.setDate(em3Dias.getDate() + 3);

      const em1Dia = new Date(hoje);
      em1Dia.setDate(em1Dia.getDate() + 1);

      // Busca usuários com assinatura ativa prestes a vencer
      let query = `
        SELECT 
          id, 
          nome, 
          email, 
          subscription_status, 
          subscription_expires_at
        FROM users 
        WHERE subscription_status = 'ativa'
          AND subscription_expires_at IS NOT NULL
          AND subscription_expires_at >= $1
          AND subscription_expires_at <= $2
          AND is_admin = false
      `;
      
      const params = [hoje.toISOString().split('T')[0], em7Dias.toISOString().split('T')[0]];

      if (userId) {
        query += ' AND id = $3';
        params.push(userId);
      }

      query += ' ORDER BY subscription_expires_at ASC';

      const result = await db.query(query, params);
      const usuarios = result.rows;

      let notificacoesCriadas = 0;

      for (const usuario of usuarios) {
        if (!usuario.subscription_expires_at) continue;

        const dataExpiracao = new Date(usuario.subscription_expires_at);
        dataExpiracao.setHours(0, 0, 0, 0);

        const diasRestantes = Math.ceil((dataExpiracao - hoje) / (1000 * 60 * 60 * 24));

        // Verifica se já existe notificação recente para este vencimento
        const notificacaoExistente = await db.query(
          `SELECT id FROM notificacoes 
           WHERE user_id = $1 
             AND tipo = 'warning'
             AND titulo LIKE $2
             AND created_at > CURRENT_DATE - INTERVAL '1 day'
             AND lida = false
           LIMIT 1`,
          [usuario.id, '%Assinatura%']
        );

        if (notificacaoExistente.rows.length > 0) {
          // Já existe notificação recente, não cria duplicata
          continue;
        }

        // Determina mensagem baseada nos dias restantes
        let titulo, mensagem, tipo;

        if (diasRestantes === 1) {
          titulo = '⚠️ Sua assinatura vence AMANHÃ!';
          mensagem = `Olá ${usuario.nome}! Sua assinatura do Suporte DP vence amanhã (${dataExpiracao.toLocaleDateString('pt-BR')}). Renove agora para continuar usando todas as funcionalidades do sistema sem interrupções.`;
          tipo = 'error';
        } else if (diasRestantes <= 3) {
          titulo = '⏰ Sua assinatura vence em breve!';
          mensagem = `Olá ${usuario.nome}! Sua assinatura do Suporte DP vence em ${diasRestantes} dias (${dataExpiracao.toLocaleDateString('pt-BR')}). Renove agora para garantir acesso contínuo ao sistema.`;
          tipo = 'warning';
        } else if (diasRestantes <= 7) {
          titulo = '📅 Lembrete: Assinatura próxima do vencimento';
          mensagem = `Olá ${usuario.nome}! Sua assinatura do Suporte DP vence em ${diasRestantes} dias (${dataExpiracao.toLocaleDateString('pt-BR')}). Que tal renovar agora e garantir seu acesso?`;
          tipo = 'warning';
        } else {
          continue; // Não cria notificação se ainda tem mais de 7 dias
        }

        // Cria notificação
        try {
          await db.query(
            `INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, lida, link)
             VALUES ($1, $2, $3, $4, false, $5)`,
            [usuario.id, tipo, titulo, mensagem, '/renovar']
          );
          notificacoesCriadas++;

          console.log(`✅ Notificação de assinatura criada para ${usuario.email} (${diasRestantes} dias restantes)`);
        } catch (error) {
          console.error(`❌ Erro ao criar notificação para ${usuario.email}:`, error.message);
        }
      }

      return {
        success: true,
        notificacoesCriadas,
        usuariosVerificados: usuarios.length
      };
    } catch (error) {
      console.error('❌ Erro ao verificar assinaturas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica se a assinatura do usuário está prestes a vencer
   * @param {string} userId - ID do usuário
   * @returns {Object} Informações sobre o status da assinatura
   */
  static async verificarStatusAssinatura(userId) {
    try {
      const result = await db.query(
        `SELECT 
          id, 
          nome, 
          email, 
          subscription_status, 
          subscription_expires_at
        FROM users 
        WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      const usuario = result.rows[0];

      if (!usuario.subscription_expires_at || usuario.subscription_status !== 'ativa') {
        return {
          success: true,
          status: 'inativa',
          diasRestantes: null
        };
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataExpiracao = new Date(usuario.subscription_expires_at);
      dataExpiracao.setHours(0, 0, 0, 0);

      const diasRestantes = Math.ceil((dataExpiracao - hoje) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        status: diasRestantes <= 0 ? 'expirada' : diasRestantes <= 7 ? 'prestes_vencer' : 'ativa',
        diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
        dataExpiracao: usuario.subscription_expires_at
      };
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AssinaturaNotificacaoService;

