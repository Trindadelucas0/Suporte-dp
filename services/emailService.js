/**
 * SERVIÇO: EmailService
 * Gerencia envio de emails para links de ativação
 * 
 * ⚠️ IMPORTANTE: Configure as variáveis de ambiente para SMTP
 * Exemplo no .env:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=seu-email@gmail.com
 * SMTP_PASS=sua-senha-app
 * SMTP_FROM=noreply@seudominio.com
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuração do transporter (será inicializado na primeira chamada)
    this.transporter = null;
    this.isConfigured = false;
  }

  /**
   * Inicializa o transporter de email
   * @returns {Object} Transporter configurado
   */
  getTransporter() {
    if (this.transporter && this.isConfigured) {
      return this.transporter;
    }

    // Verifica se as variáveis de ambiente estão configuradas
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('⚠️  SMTP não configurado. Emails não serão enviados.');
      console.warn('💡 Configure SMTP_HOST, SMTP_USER, SMTP_PASS no .env');
      this.isConfigured = false;
      return null;
    }

    // Cria transporter
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465, // true para 465, false para outras portas
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    this.isConfigured = true;
    return this.transporter;
  }

  /**
   * Envia email com link de ativação
   * @param {Object} data - Dados do email
   * @param {string} data.email - Email do destinatário
   * @param {string} data.nome - Nome do cliente
   * @param {string} data.link - Link de ativação completo
   * @param {Date} data.expiresAt - Data de expiração do link
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendActivationLink(data) {
    const transporter = this.getTransporter();

    if (!transporter) {
      console.error('❌ Email não enviado: SMTP não configurado');
      return {
        success: false,
        error: 'Serviço de email não configurado'
      };
    }

    const appName = process.env.APP_NAME || 'Suporte DP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const expiresInDays = Math.ceil((new Date(data.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: data.email,
      subject: `🎉 Bem-vindo! Complete seu cadastro - ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover {
              background: #5568d3;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Parabéns pela sua compra!</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${data.nome || 'Cliente'}</strong>!</p>
            
            <p>Recebemos a confirmação da sua compra e estamos muito felizes em tê-lo(a) conosco!</p>
            
            <p>Para começar a usar o sistema, você precisa completar seu cadastro clicando no botão abaixo:</p>
            
            <div style="text-align: center;">
              <a href="${data.link}" class="button">Completar Meu Cadastro</a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px;">
              ${data.link}
            </p>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este link expira em <strong>${expiresInDays} dia(s)</strong>.
              Após essa data, você precisará solicitar um novo link de ativação.
            </div>
            
            <p>Se você não realizou nenhuma compra, por favor ignore este email.</p>
            
            <p>Bem-vindo(a) e aproveite!</p>
            
            <p>Atenciosamente,<br>
            <strong>Equipe ${appName}</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>${appUrl}</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Parabéns pela sua compra, ${data.nome || 'Cliente'}!
        
        Recebemos a confirmação da sua compra e estamos muito felizes em tê-lo(a) conosco!
        
        Para começar a usar o sistema, você precisa completar seu cadastro acessando este link:
        
        ${data.link}
        
        IMPORTANTE: Este link expira em ${expiresInDays} dia(s). Após essa data, você precisará solicitar um novo link de ativação.
        
        Se você não realizou nenhuma compra, por favor ignore este email.
        
        Bem-vindo(a) e aproveite!
        
        Equipe ${appName}
        ${appUrl}
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email de ativação enviado:', info.messageId);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Testa a configuração do SMTP
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConnection() {
    const transporter = this.getTransporter();

    if (!transporter) {
      return {
        success: false,
        error: 'SMTP não configurado'
      };
    }

    try {
      await transporter.verify();
      return {
        success: true,
        message: 'Conexão SMTP verificada com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exporta instância singleton
module.exports = new EmailService();

