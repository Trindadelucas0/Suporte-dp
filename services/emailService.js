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
require('dotenv').config();

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
      return {
        success: false,
        error: 'SMTP não configurado'
      };
    }

    try {
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      
      const mailOptions = {
        from: `"Suporte DP" <${smtpFrom}>`,
        to: data.email,
        subject: 'Bem-vindo ao Suporte DP - Complete seu cadastro',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bem-vindo ao Suporte DP!</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${data.nome}</strong>!</p>
                <p>Obrigado por adquirir o Suporte DP. Seu pagamento foi processado com sucesso!</p>
                <p>Para completar seu cadastro e começar a usar o sistema, clique no botão abaixo:</p>
                <p style="text-align: center;">
                  <a href="${data.link}" class="button">Complete seu Cadastro</a>
                </p>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${data.link}</p>
                <p><strong>Importante:</strong> Este link é válido por tempo indeterminado, mas recomendamos que complete seu cadastro o quanto antes.</p>
                <p>Se você não fez esta compra, por favor ignore este email.</p>
              </div>
              <div class="footer">
                <p>Suporte DP - Sistema de Cálculos Trabalhistas</p>
                <p>© 2024 - Todos os direitos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email de ativação enviado:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Erro ao enviar email de ativação:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia email de confirmação de pagamento (novo)
   * @param {Object} data - Dados do email
   * @param {string} data.email - Email do destinatário
   * @param {string} data.nome - Nome do cliente (ou "Cliente" se não informado)
   * @param {string} data.orderNsu - Order NSU do pagamento
   * @param {number} data.valor - Valor pago
   * @param {string} data.linkCadastro - Link para cadastro
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPaymentConfirmation(data) {
    const transporter = this.getTransporter();

    if (!transporter) {
      console.warn('⚠️ SMTP não configurado. Email de confirmação não será enviado.');
      return {
        success: false,
        error: 'SMTP não configurado'
      };
    }

    try {
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const nome = data.nome || 'Cliente';
      
      const mailOptions = {
        from: `"Suporte DP" <${smtpFrom}>`,
        to: data.email,
        subject: 'Pagamento Confirmado - Suporte DP',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .info-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Pagamento Confirmado!</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${nome}</strong>!</p>
                <div class="info-box">
                  <p><strong>Seu pagamento foi processado com sucesso!</strong></p>
                  <p>Valor: <strong>R$ ${parseFloat(data.valor).toFixed(2)}</strong></p>
                  <p>Pedido: <code>${data.orderNsu}</code></p>
                </div>
                <p>Para completar seu cadastro e começar a usar o sistema, clique no botão abaixo:</p>
                <p style="text-align: center;">
                  <a href="${data.linkCadastro}" class="button">Fazer Cadastro</a>
                </p>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">${data.linkCadastro}</p>
                <p><strong>Importante:</strong> Você precisa completar o cadastro para acessar o sistema.</p>
              </div>
              <div class="footer">
                <p>Suporte DP - Sistema de Cálculos Trabalhistas</p>
                <p>© 2024 - Todos os direitos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email de confirmação de pagamento enviado:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Erro ao enviar email de confirmação:', error);
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
