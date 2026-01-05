/**
 * SERVIÇO: EmailService
 * Gerencia envio de emails do sistema
 * 
 * Suporta dois modos:
 * 1. API do Resend (recomendado para Render) - usa RESEND_API_KEY
 * 2. SMTP tradicional - usa SMTP_HOST, SMTP_USER, SMTP_PASS
 * 
 * ⚠️ IMPORTANTE: Para Render, use API do Resend (não SMTP)
 * Configure RESEND_API_KEY no Render
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Tenta carregar Resend (opcional)
let Resend = null;
try {
  // Resend exporta como { Resend: [class Resend] }, então usamos destructuring
  const resendModule = require('resend');
  Resend = resendModule.Resend; // Forma correta: { Resend } = require('resend')
  if (!Resend || typeof Resend !== 'function') {
    console.warn('⚠️ EmailService: Classe Resend não encontrada ou inválida no módulo');
    Resend = null;
  }
} catch (e) {
  // Resend não instalado - usará SMTP
  console.warn('⚠️ EmailService: Pacote "resend" não encontrado:', e.message);
  Resend = null;
}

class EmailService {
  constructor() {
    // Configuração do transporter (será inicializado na primeira chamada)
    this.transporter = null;
    this.isConfigured = false;
    this.resendClient = null;
    this.useResendAPI = false;
    
    // Verifica se deve usar API do Resend
    console.log('🔍 EmailService: Verificando configuração de email...');
    console.log('   - Resend instalado:', Resend ? '✅ SIM' : '❌ NÃO');
    console.log('   - RESEND_API_KEY configurado:', process.env.RESEND_API_KEY ? '✅ SIM' : '❌ NÃO');
    console.log('   - SMTP_HOST configurado:', process.env.SMTP_HOST ? '✅ SIM' : '❌ NÃO');
    
    if (Resend && process.env.RESEND_API_KEY) {
      try {
        this.resendClient = new Resend(process.env.RESEND_API_KEY);
        this.useResendAPI = true;
        console.log('✅ EmailService: Usando API do Resend (recomendado para Render)');
        console.log('   - API Key:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
      } catch (e) {
        console.warn('⚠️ EmailService: Erro ao inicializar Resend, usando SMTP:', e.message);
      }
    } else {
      if (!Resend) {
        console.warn('⚠️ EmailService: Pacote "resend" não instalado. Instale com: npm install resend');
      }
      if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ EmailService: RESEND_API_KEY não configurado. Configure no Render para evitar timeout SMTP.');
      }
      console.log('📧 EmailService: Usando SMTP tradicional (pode ter timeout no Render)');
    }
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

    // Cria transporter com configurações de timeout
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465, // true para 465, false para outras portas
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 20000, // 20 segundos para estabelecer conexão
      greetingTimeout: 20000, // 20 segundos para greeting
      socketTimeout: 20000, // 20 segundos para timeout de socket
      // Não usar pool em produção (pode causar problemas de conexão)
      pool: false
    });

    this.isConfigured = true;
    return this.transporter;
  }

  /**
   * Envia email com token usando API do Resend (recomendado para Render)
   * @param {Object} data - Dados do email
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPaymentTokenViaResendAPI(data) {
    try {
      const smtpFrom = process.env.SMTP_FROM || 'noreply@pixsile.resend.app';
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const nome = data.nome || 'Cliente';
      const validationUrl = `${appUrl}/validar-pagamento?token=${data.token}&email=${encodeURIComponent(data.email)}`;

      const htmlContent = `
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
      `;

      const textContent = `
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
      `;

      const result = await this.resendClient.emails.send({
        from: `Suporte DP <${smtpFrom}>`,
        to: data.email,
        subject: 'Token de Validação de Pagamento - Suporte DP',
        html: htmlContent,
        text: textContent
      });

      // Resend API retorna { data: { id: ... }, error: null } ou { data: null, error: ... }
      const messageId = result.data?.id || result.id || 'N/A';
      
      if (result.error) {
        throw new Error(result.error.message || 'Erro ao enviar email via Resend API');
      }

      console.log('✅ EmailService (Resend API): Token de pagamento enviado para:', data.email);
      console.log('📬 EmailService (Resend API): Message ID:', messageId);
      console.log('📋 EmailService (Resend API): Token enviado:', data.token);
      console.log('📋 EmailService (Resend API): Resposta completa:', JSON.stringify(result, null, 2));

      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      console.error('❌ EmailService (Resend API): Erro ao enviar email de token:', error.message);
      console.error('❌ EmailService (Resend API): Email destinatário:', data.email);
      console.error('❌ EmailService (Resend API): Token:', data.token);
      console.error('❌ EmailService (Resend API): Stack:', error.stack);

      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN'
      };
    }
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
    // Verifica novamente se RESEND_API_KEY está disponível (pode ter sido configurado depois)
    // Isso garante que mesmo se a variável foi adicionada após o servidor iniciar, ainda funciona
    if (!this.useResendAPI && Resend && process.env.RESEND_API_KEY) {
      try {
        // Verifica se Resend é uma função/construtor
        if (typeof Resend !== 'function') {
          console.error('❌ EmailService: Resend não é um construtor. Tipo:', typeof Resend);
          throw new Error('Resend não é um construtor válido');
        }
        this.resendClient = new Resend(process.env.RESEND_API_KEY);
        this.useResendAPI = true;
        console.log('✅ EmailService: API do Resend detectada e inicializada (configurada após startup)');
      } catch (e) {
        console.error('❌ EmailService: Erro ao inicializar Resend:', e.message);
        console.error('   - Stack:', e.stack);
      }
    }
    
    // Se Resend API está disponível, usa ela (melhor para Render)
    if (this.useResendAPI && this.resendClient) {
      console.log('📧 EmailService: Usando API do Resend para enviar email');
      return await this.sendPaymentTokenViaResendAPI(data);
    }

    // Caso contrário, usa SMTP tradicional
    console.log('📧 EmailService: Usando SMTP tradicional (RESEND_API_KEY não configurado)');
    console.log('💡 Para usar API do Resend no Render, configure RESEND_API_KEY no Render');
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
      console.log('✅ EmailService: Token de pagamento enviado para:', data.email);
      console.log('📬 EmailService: Message ID:', info.messageId);
      console.log('📋 EmailService: Token enviado:', data.token);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      // Log detalhado do erro
      console.error('❌ EmailService: Erro ao enviar email de token:', error.message);
      console.error('❌ EmailService: Código do erro:', error.code || 'N/A');
      console.error('❌ EmailService: Email destinatário:', data.email);
      console.error('❌ EmailService: Token:', data.token);
      
      // Mensagem de erro mais específica baseada no tipo de erro
      let errorMessage = error.message;
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Timeout ou conexão recusada com servidor SMTP. Verifique a configuração de email e conectividade de rede.';
        console.error('❌ EmailService: Erro de conexão SMTP - verifique:');
        console.error('   - SMTP_HOST:', process.env.SMTP_HOST);
        console.error('   - SMTP_PORT:', process.env.SMTP_PORT);
        console.error('   - Conectividade de rede/firewall');
        console.error('   - Se o servidor SMTP está acessível');
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Falha na autenticação SMTP. Verifique SMTP_USER e SMTP_PASS.';
        console.error('❌ EmailService: Erro de autenticação SMTP - verifique credenciais');
      } else if (error.code === 'ESOCKET') {
        errorMessage = 'Erro de socket ao conectar ao servidor SMTP. Verifique conectividade.';
        console.error('❌ EmailService: Erro de socket SMTP - verifique conectividade de rede');
      }
      
      console.error('❌ EmailService: Stack:', error.stack);
      
      return {
        success: false,
        error: errorMessage,
        code: error.code
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

  /**
   * Envia email de notificação para admin quando novo usuário se cadastra
   * @param {Object} data - Dados do novo usuário
   * @param {string} data.nome - Nome do usuário
   * @param {string} data.email - Email do usuário
   * @param {string} data.whatsapp - WhatsApp do usuário (opcional)
   * @param {string} data.subscription_status - Status da assinatura
   * @param {string} data.data_cadastro - Data do cadastro
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendNewUserNotification(data) {
    // Verifica novamente se RESEND_API_KEY está disponível
    if (!this.useResendAPI && Resend && process.env.RESEND_API_KEY) {
      try {
        if (typeof Resend !== 'function') {
          console.error('❌ EmailService: Resend não é um construtor. Tipo:', typeof Resend);
          throw new Error('Resend não é um construtor válido');
        }
        this.resendClient = new Resend(process.env.RESEND_API_KEY);
        this.useResendAPI = true;
        console.log('✅ EmailService: API do Resend detectada e inicializada (configurada após startup)');
      } catch (e) {
        console.error('❌ EmailService: Erro ao inicializar Resend:', e.message);
        console.error('   - Stack:', e.stack);
      }
    }
    
    // Se Resend API está disponível, usa ela (melhor para Render)
    if (this.useResendAPI && this.resendClient) {
      console.log('📧 EmailService: Usando API do Resend para enviar notificação de novo usuário');
      return await this.sendNewUserNotificationViaResendAPI(data);
    }

    // Caso contrário, usa SMTP tradicional
    console.log('📧 EmailService: Usando SMTP tradicional para notificação (RESEND_API_KEY não configurado)');
    const transporter = this.getTransporter();

    if (!transporter) {
      console.warn('⚠️ SMTP não configurado. Email de notificação de novo usuário não será enviado.');
      return {
        success: false,
        error: 'SMTP não configurado'
      };
    }

    try {
      const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
      const adminEmail = 'lucasrodrigues4@live.com';
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const nome = data.nome || 'Não informado';
      const email = data.email || 'Não informado';
      const whatsapp = data.whatsapp || 'Não informado';
      const subscriptionStatus = data.subscription_status || 'pendente';
      const dataCadastro = data.data_cadastro || new Date().toLocaleString('pt-BR');

      const mailOptions = {
        from: `"Suporte DP - Sistema" <${smtpFrom}>`,
        to: adminEmail,
        subject: `🆕 Novo Usuário Cadastrado - ${nome}`,
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Novo Usuário Cadastrado</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🆕 Novo Usuário Cadastrado</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
              <h2 style="color: #DC2626; margin-top: 0;">Um novo usuário se cadastrou no sistema!</h2>
              
              <div style="background: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #DC2626; margin-top: 0; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">Dados do Usuário</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666; width: 40%;">Nome:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${nome}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Email:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">WhatsApp:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${whatsapp}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Status Assinatura:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">
                      <span style="background: ${subscriptionStatus === 'ativa' ? '#10b981' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${subscriptionStatus === 'ativa' ? '✅ Ativa' : '⏳ Pendente'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; font-weight: bold; color: #666;">Data do Cadastro:</td>
                    <td style="padding: 10px; color: #333;">${dataCadastro}</td>
                  </tr>
                </table>
              </div>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${appUrl}/admin/usuarios" 
                   style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-weight: bold;
                          display: inline-block;">
                  Ver Usuários no Sistema
                </a>
              </div>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                Esta é uma notificação automática do sistema Suporte DP.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
🆕 Novo Usuário Cadastrado - Suporte DP

Um novo usuário se cadastrou no sistema!

Dados do Usuário:
- Nome: ${nome}
- Email: ${email}
- WhatsApp: ${whatsapp}
- Status Assinatura: ${subscriptionStatus}
- Data do Cadastro: ${dataCadastro}

Acesse o painel administrativo: ${appUrl}/admin/usuarios

Esta é uma notificação automática do sistema Suporte DP.
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ EmailService: Notificação de novo usuário enviada:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ EmailService: Erro ao enviar notificação de novo usuário:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envia notificação de novo usuário via API do Resend
   * @param {Object} data - Dados do novo usuário
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendNewUserNotificationViaResendAPI(data) {
    try {
      const smtpFrom = process.env.SMTP_FROM || 'noreply@pixsile.resend.app';
      const adminEmail = 'lucasrodrigues4@live.com';
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const nome = data.nome || 'Não informado';
      const email = data.email || 'Não informado';
      const whatsapp = data.whatsapp || 'Não informado';
      const subscriptionStatus = data.subscription_status || 'pendente';
      const dataCadastro = data.data_cadastro || new Date().toLocaleString('pt-BR');

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Novo Usuário Cadastrado</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🆕 Novo Usuário Cadastrado</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #DC2626; margin-top: 0;">Um novo usuário se cadastrou no sistema!</h2>
            
            <div style="background: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #DC2626; margin-top: 0; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">Dados do Usuário</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666; width: 40%;">Nome:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${nome}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Email:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">WhatsApp:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${whatsapp}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;">Status Assinatura:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">
                    <span style="background: ${subscriptionStatus === 'ativa' ? '#10b981' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                      ${subscriptionStatus === 'ativa' ? '✅ Ativa' : '⏳ Pendente'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; font-weight: bold; color: #666;">Data do Cadastro:</td>
                  <td style="padding: 10px; color: #333;">${dataCadastro}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${appUrl}/admin/usuarios" 
                 style="background: linear-gradient(135deg, #DC2626 0%, #FBBF24 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold;
                        display: inline-block;">
                Ver Usuários no Sistema
              </a>
            </div>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              Esta é uma notificação automática do sistema Suporte DP.
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
🆕 Novo Usuário Cadastrado - Suporte DP

Um novo usuário se cadastrou no sistema!

Dados do Usuário:
- Nome: ${nome}
- Email: ${email}
- WhatsApp: ${whatsapp}
- Status Assinatura: ${subscriptionStatus}
- Data do Cadastro: ${dataCadastro}

Acesse o painel administrativo: ${appUrl}/admin/usuarios

Esta é uma notificação automática do sistema Suporte DP.
      `;

      const result = await this.resendClient.emails.send({
        from: `Suporte DP - Sistema <${smtpFrom}>`,
        to: adminEmail,
        subject: `🆕 Novo Usuário Cadastrado - ${nome}`,
        html: htmlContent,
        text: textContent
      });

      // Resend API retorna { data: { id: ... }, error: null } ou { data: null, error: ... }
      const messageId = result.data?.id || result.id || 'N/A';
      
      if (result.error) {
        throw new Error(result.error.message || 'Erro ao enviar email via Resend API');
      }

      console.log('✅ EmailService (Resend API): Notificação de novo usuário enviada');
      console.log('📬 EmailService (Resend API): Message ID:', messageId);

      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      console.error('❌ EmailService (Resend API): Erro ao enviar notificação de novo usuário:', error.message);
      console.error('❌ EmailService (Resend API): Stack:', error.stack);
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN'
      };
    }
  }
}

// Exporta uma instância singleton
module.exports = new EmailService();
