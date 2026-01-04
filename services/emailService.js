/**
 * SERVIÇO: EmailService
 * Gerencia envio de emails do sistema
 * 
 * ⚠️ IMPORTANTE: Configure as variáveis de ambiente para SMTP
 * Exemplo no .env:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=seu-email@gmail.com
 * SMTP_PASS=sua-senha-de-app (não use senha normal, use senha de app)
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
   * Envia email com token de validação de pagamento
   * @param {Object} data - Dados do email
   * @param {string} data.email - Email do destinatário
   * @param {string} data.token - Token de validação
   * @param {string} data.nome - Nome do cliente (ou "Cliente" se não informado)
   * @param {string} data.orderNsu - Order NSU do pagamento
   * @param {number} data.valor - Valor pago
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPaymentToken(data) {
    const transporter = this.getTransporter();

    if (!transporter) {
      console.warn('⚠️ SMTP não configurado. Email de token não será enviado.');
      return {
        success: false,
        error: 'SMTP não configurado'
      };
    }

    try {
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const nome = data.nome || 'Cliente';
      const validationUrl = `${appUrl}/validar-pagamento?token=${data.token}&email=${encodeURIComponent(data.email)}`;

      const mailOptions = {
        from: `"Suporte DP" <${smtpFrom}>`,
        to: data.email,
        subject: 'Token de Validação de Pagamento - Suporte DP',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Token de Validação</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Suporte DP</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
              <h2 style="color: #DC2626; margin-top: 0;">Token de Validação de Pagamento</h2>
              
              <p>Olá ${nome},</p>
              
              <p>Seu pagamento foi processado com sucesso! Para liberar o acesso ao sistema, você precisa validar seu pagamento usando o token abaixo:</p>
              
              <div style="background: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 10px;">Seu token de validação:</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #DC2626; letter-spacing: 3px; font-family: monospace;">${data.token}</p>
              </div>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${validationUrl}" 
                   style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          display: inline-block;">
                  Validar Pagamento
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                Ou acesse: <a href="${appUrl}/validar-pagamento">${appUrl}/validar-pagamento</a> e insira o token acima.
              </p>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚠️ Importante:</strong>
                  <br>• Este token expira em 24 horas
                  <br>• O token só pode ser usado uma vez
                  <br>• Use o email: <strong>${data.email}</strong> junto com o token
                  <br>• Valor pago: R$ ${data.valor.toFixed(2).replace('.', ',')}
                  <br>• Pedido: ${data.orderNsu}
                </p>
              </div>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                Se você não realizou este pagamento, ignore este email.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
Suporte DP - Token de Validação de Pagamento

Olá ${nome},

Seu pagamento foi processado com sucesso! Para liberar o acesso ao sistema, você precisa validar seu pagamento usando o token abaixo:

TOKEN: ${data.token}

Acesse: ${validationUrl}

OU acesse ${appUrl}/validar-pagamento e insira o email e token.

Importante:
- Este token expira em 24 horas
- O token só pode ser usado uma vez
- Use o email: ${data.email} junto com o token
- Valor pago: R$ ${data.valor.toFixed(2).replace('.', ',')}
- Pedido: ${data.orderNsu}

Se você não realizou este pagamento, ignore este email.
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ EmailService: Token de pagamento enviado:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ EmailService: Erro ao enviar email de token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia email de confirmação de pagamento (mantido para compatibilidade)
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
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pagamento Confirmado</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Suporte DP</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
              <h2 style="color: #DC2626; margin-top: 0;">Pagamento Confirmado!</h2>
              
              <p>Olá ${nome},</p>
              
              <p>Seu pagamento foi processado com sucesso!</p>
              
              <div style="background: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 10px;">Valor pago:</p>
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #DC2626;">R$ ${data.valor.toFixed(2).replace('.', ',')}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Pedido: ${data.orderNsu}</p>
              </div>
              
              ${data.linkCadastro ? `
              <div style="margin: 30px 0; text-align: center;">
                <a href="${data.linkCadastro}" 
                   style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          display: inline-block;">
                  Complete seu Cadastro
                </a>
              </div>
              ` : ''}
              
              <p style="font-size: 14px; color: #666;">
                Se você não realizou este pagamento, entre em contato conosco.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
Suporte DP - Pagamento Confirmado

Olá ${nome},

Seu pagamento foi processado com sucesso!

Valor pago: R$ ${data.valor.toFixed(2).replace('.', ',')}
Pedido: ${data.orderNsu}

${data.linkCadastro ? `Complete seu cadastro: ${data.linkCadastro}` : ''}

Se você não realizou este pagamento, entre em contato conosco.
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ EmailService: Email de confirmação enviado:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ EmailService: Erro ao enviar email de confirmação:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exporta uma instância singleton
module.exports = new EmailService();
