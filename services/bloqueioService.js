/**
 * SERVICE: BloqueioService
 * Gerencia bloqueio e liberação de acesso por pagamento
 */

const Cobranca = require('../models/Cobranca');
const User = require('../models/User');
const db = require('../config/database');
const crypto = require('crypto');
const emailService = require('./emailService');

class BloqueioService {
  /**
   * Verifica e bloqueia usuários com pagamento em atraso
   * @returns {Promise<Object>} Resultado do bloqueio
   */
  async verificarEBloquearUsuarios() {
    console.log('🔄 Verificando usuários para bloqueio...');

    const diasParaBloqueio = parseInt(process.env.DIAS_PARA_BLOQUEIO || 7);
    const hoje = new Date();
    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() - diasParaBloqueio);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];

    // Busca usuários com cobranças vencidas há mais de X dias
    const result = await db.query(
      `SELECT DISTINCT u.id, u.nome, u.email, u.bloqueado_pagamento
       FROM users u
       INNER JOIN cobrancas c ON c.user_id = u.id
       WHERE c.status IN ('pendente', 'vencida')
       AND c.data_vencimento < $1
       AND (u.bloqueado_pagamento = FALSE OR u.bloqueado_pagamento IS NULL)
       AND (u.ativo = TRUE OR u.ativo IS NULL)`,
      [dataLimiteStr]
    );

    const bloqueados = [];
    const erros = [];

    for (const user of result.rows) {
      try {
        // Bloqueia usuário
        await db.query(
          'UPDATE users SET bloqueado_pagamento = TRUE WHERE id = $1',
          [user.id]
        );

        // Envia email de bloqueio
        await this.enviarEmailBloqueio(user);

        bloqueados.push(user.id);
        console.log(`🔒 Usuário ${user.id} bloqueado por falta de pagamento`);
      } catch (error) {
        console.error(`❌ Erro ao bloquear usuário ${user.id}:`, error.message);
        erros.push(user.id);
      }
    }

    console.log(`✅ ${bloqueados.length} usuários bloqueados, ${erros.length} erros`);
    return { bloqueados, erros };
  }

  /**
   * Libera acesso após pagamento confirmado
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Resultado da liberação
   */
  async liberarAcesso(userId) {
    // Desbloqueia usuário
    await db.query(
      'UPDATE users SET bloqueado_pagamento = FALSE WHERE id = $1',
      [userId]
    );

    // Busca usuário
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Gera link de ativação
    const linkAtivacao = await this.gerarLinkAtivacao(userId);

    // Envia email com link de ativação
    await this.enviarEmailLiberacao(user, linkAtivacao);

    console.log(`✅ Acesso liberado para usuário ${userId}`);
    return { success: true, linkAtivacao };
  }

  /**
   * Gera link único de ativação
   * @param {string} userId - ID do usuário
   * @returns {Promise<string>} Link de ativação
   */
  async gerarLinkAtivacao(userId) {
    // Gera token único
    const token = crypto.randomBytes(32).toString('hex');

    // Expira em 7 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Salva no banco
    await db.query(
      `INSERT INTO links_ativacao (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${appUrl}/cobranca/ativar/${token}`;
  }

  /**
   * Valida e usa link de ativação
   * @param {string} token - Token do link
   * @returns {Promise<Object>} Resultado da validação
   */
  async validarLinkAtivacao(token) {
    const result = await db.query(
      `SELECT * FROM links_ativacao 
       WHERE token = $1 
       AND usado = FALSE 
       AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Link inválido ou expirado' };
    }

    const link = result.rows[0];

    // Marca como usado
    await db.query(
      'UPDATE links_ativacao SET usado = TRUE WHERE id = $1',
      [link.id]
    );

    // Garante que usuário está desbloqueado
    await db.query(
      'UPDATE users SET bloqueado_pagamento = FALSE WHERE id = $1',
      [link.user_id]
    );

    return { success: true, userId: link.user_id };
  }

  /**
   * Envia email de bloqueio
   * @param {Object} user - Dados do usuário
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarEmailBloqueio(user) {
    // Busca última cobrança pendente
    const cobranca = await db.query(
      `SELECT * FROM cobrancas 
       WHERE user_id = $1 
       AND status IN ('pendente', 'vencida')
       ORDER BY data_vencimento DESC
       LIMIT 1`,
      [user.id]
    );

    const appName = process.env.APP_NAME || 'Suporte DP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const linkPagamento = cobranca.rows[0]?.link_pagamento || `${appUrl}/cobranca`;

    const emailData = {
      to: user.email,
      subject: `🔒 Acesso Bloqueado - ${appName}`,
      html: this.getTemplateBloqueio({
        nome: user.nome,
        linkPagamento: linkPagamento,
        appName: appName
      })
    };

    return await emailService.sendEmail(emailData);
  }

  /**
   * Envia email de liberação
   * @param {Object} user - Dados do usuário
   * @param {string} linkAtivacao - Link de ativação
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarEmailLiberacao(user, linkAtivacao) {
    const appName = process.env.APP_NAME || 'Suporte DP';

    const emailData = {
      to: user.email,
      subject: `✅ Pagamento Confirmado - ${appName}`,
      html: this.getTemplateLiberacao({
        nome: user.nome,
        linkAtivacao: linkAtivacao,
        appName: appName
      })
    };

    return await emailService.sendEmail(emailData);
  }

  /**
   * Template HTML para email de bloqueio
   */
  getTemplateBloqueio(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .alert { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Acesso Bloqueado</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${data.nome}</strong>!</p>
          <div class="alert">
            <p><strong>Seu acesso foi bloqueado</strong> devido ao atraso no pagamento da mensalidade.</p>
          </div>
          <p>Para reativar seu acesso, efetue o pagamento da mensalidade em atraso.</p>
          <div style="text-align: center;">
            <a href="${data.linkPagamento}" class="button">Pagar e Reativar Acesso</a>
          </div>
          <p>Após a confirmação do pagamento, seu acesso será liberado automaticamente.</p>
          <p>Atenciosamente,<br><strong>Equipe ${data.appName}</strong></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template HTML para email de liberação
   */
  getTemplateLiberacao(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #4caf50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .success { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Pagamento Confirmado</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${data.nome}</strong>!</p>
          <div class="success">
            <p><strong>Seu pagamento foi confirmado!</strong></p>
            <p>Seu acesso foi liberado. Clique no botão abaixo para ativar sua conta:</p>
          </div>
          <div style="text-align: center;">
            <a href="${data.linkAtivacao}" class="button">Ativar Minha Conta</a>
          </div>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px;">
            ${data.linkAtivacao}
          </p>
          <p>Atenciosamente,<br><strong>Equipe ${data.appName}</strong></p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new BloqueioService();

