/**
 * SERVICE: CadastroService
 * Gerencia cadastro de novos usuários via link de ativação
 */

const db = require('../config/database');
const crypto = require('crypto');
const emailService = require('./emailService');
const User = require('../models/User');

class CadastroService {
  /**
   * Gera link de cadastro para email (após assinatura)
   * @param {string} email - Email do cliente
   * @param {string} nome - Nome do cliente (opcional)
   * @returns {Promise<string>} Link de cadastro
   */
  async gerarLinkCadastro(email, nome = '') {
    // Gera token único
    const token = crypto.randomBytes(32).toString('hex');

    // Expira em 7 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Salva no banco (usando activation_links se existir)
    try {
      // Verifica se a tabela existe e se tem campo plataforma
      const tableCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'activation_links' 
        AND column_name = 'plataforma'
      `);
      
      const hasPlataforma = tableCheck.rows.length > 0;
      
      if (hasPlataforma) {
        // Tabela tem campo plataforma (obrigatório)
        await db.query(
          `INSERT INTO activation_links (email, token, nome_cliente, plataforma, expires_at, status)
           VALUES ($1, $2, $3, 'infinitepay', $4, 'pending')
           ON CONFLICT (token) DO NOTHING`,
          [email, token, nome, expiresAt]
        );
      } else {
        // Tabela não tem campo plataforma
        await db.query(
          `INSERT INTO activation_links (email, token, nome_cliente, expires_at, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (token) DO NOTHING`,
          [email, token, nome, expiresAt]
        );
      }
    } catch (e) {
      console.error('⚠️  Erro ao salvar link de cadastro:', e.message);
      // Continua mesmo se der erro (para não quebrar o fluxo)
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${appUrl}/cadastro/${token}`;
  }

  /**
   * Valida token de cadastro
   * @param {string} token - Token do link
   * @returns {Promise<Object>} Dados do link
   */
  async validarTokenCadastro(token) {
    try {
      // Busca em activation_links
      const result = await db.query(
        `SELECT * FROM activation_links 
         WHERE token = $1 
         AND status = 'pending'
         AND expires_at > NOW()`,
        [token]
      );

      if (result.rows.length > 0) {
        const link = result.rows[0];
        return {
          success: true,
          email: link.email,
          nome: link.nome_cliente || '',
          token: token
        };
      }

      return { success: false, error: 'Link inválido ou expirado' };
    } catch (error) {
      console.error('Erro ao validar token de cadastro:', error);
      return { success: false, error: 'Erro ao validar link' };
    }
  }

  /**
   * Marca token como usado após cadastro
   * @param {string} token - Token usado
   * @returns {Promise<void>}
   */
  async marcarTokenComoUsado(token) {
    try {
      await db.query(
        `UPDATE activation_links 
         SET status = 'used', used_at = NOW() 
         WHERE token = $1`,
        [token]
      );
    } catch (error) {
      console.error('Erro ao marcar token como usado:', error);
    }
  }

  /**
   * Envia email com link de cadastro
   * @param {string} email - Email do destinatário
   * @param {string} nome - Nome do destinatário
   * @param {string} linkCadastro - Link de cadastro
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarEmailCadastro(email, nome, linkCadastro) {
    const appName = process.env.APP_NAME || 'Suporte DP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const emailData = {
      to: email,
      subject: `🎉 Assinatura Confirmada - Complete seu Cadastro - ${appName}`,
      html: this.getTemplateEmailCadastro({
        nome: nome,
        linkCadastro: linkCadastro,
        appName: appName,
        expiresInDays: 7
      })
    };

    return await emailService.sendEmail(emailData);
  }

  /**
   * Template HTML para email de cadastro
   */
  getTemplateEmailCadastro(data) {
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
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Assinatura Confirmada!</h1>
        </div>
        <div class="content">
          <p>Olá${data.nome ? ', <strong>' + data.nome + '</strong>' : ''}!</p>
          <div class="success">
            <p><strong>Parabéns! Sua assinatura foi confirmada com sucesso!</strong></p>
            <p>Agora você precisa completar seu cadastro para acessar o sistema.</p>
          </div>
          <div style="text-align: center;">
            <a href="${data.linkCadastro}" class="button">Completar Meu Cadastro</a>
          </div>
          <div class="warning">
            <p><strong>⚠️ Importante:</strong></p>
            <p>Este link expira em <strong>${data.expiresInDays} dias</strong>. Após essa data, você precisará solicitar um novo link.</p>
          </div>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px;">
            ${data.linkCadastro}
          </p>
          <p>Bem-vindo(a) e aproveite!</p>
          <p>Atenciosamente,<br><strong>Equipe ${data.appName}</strong></p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new CadastroService();

