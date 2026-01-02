/**
 * CONTROLLER: WebhookController
 * Processa webhooks de vendas das plataformas
 * 
 * ⚠️ IMPORTANTE: Este controller NÃO cria usuários.
 * Apenas gera links de ativação e envia por email.
 */

const ActivationLink = require('../models/ActivationLink');
const WebhookValidator = require('../services/webhookValidator');
const WebhookParser = require('../services/webhookParser');
const EmailService = require('../services/emailService');
const User = require('../models/User');

class WebhookController {
  /**
   * Processa webhook da Kiwify
   * POST /webhook/kiwify
   */
  static async handleKiwify(req, res) {
    try {
      // Obtém o body raw para validação de assinatura
      const rawBody = req.rawBody || JSON.stringify(req.body);
      
      // Valida assinatura do webhook
      if (!WebhookValidator.validateKiwify(req, rawBody)) {
        console.error('❌ Webhook Kiwify: Assinatura inválida');
        return res.status(401).json({
          success: false,
          error: 'Assinatura inválida'
        });
      }

      // Parse dos dados
      const vendaData = WebhookParser.parseKiwify(req.body);
      
      if (!vendaData) {
        console.log('ℹ️  Webhook Kiwify: Evento ignorado (não é venda aprovada)');
        return res.status(200).json({
          success: true,
          message: 'Evento processado (ignorado)'
        });
      }

      // Processa a venda
      const result = await this.processSale(vendaData);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: result
      });

    } catch (error) {
      console.error('❌ Erro ao processar webhook Kiwify:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar webhook'
      });
    }
  }

  /**
   * Processa webhook da Hotmart
   * POST /webhook/hotmart
   */
  static async handleHotmart(req, res) {
    try {
      // Obtém o body raw para validação de assinatura
      const rawBody = req.rawBody || JSON.stringify(req.body);
      
      // Valida assinatura do webhook
      if (!WebhookValidator.validateHotmart(req, rawBody)) {
        console.error('❌ Webhook Hotmart: Assinatura inválida');
        return res.status(401).json({
          success: false,
          error: 'Assinatura inválida'
        });
      }

      // Parse dos dados
      const vendaData = WebhookParser.parseHotmart(req.body);
      
      if (!vendaData) {
        console.log('ℹ️  Webhook Hotmart: Evento ignorado (não é venda aprovada)');
        return res.status(200).json({
          success: true,
          message: 'Evento processado (ignorado)'
        });
      }

      // Processa a venda
      const result = await this.processSale(vendaData);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: result
      });

    } catch (error) {
      console.error('❌ Erro ao processar webhook Hotmart:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar webhook'
      });
    }
  }

  /**
   * Processa webhook da Kirvano
   * POST /webhook/kirvano
   */
  static async handleKirvano(req, res) {
    try {
      // Obtém o body raw para validação de assinatura
      const rawBody = req.rawBody || JSON.stringify(req.body);
      
      // Valida assinatura do webhook
      if (!WebhookValidator.validateKirvano(req, rawBody)) {
        console.error('❌ Webhook Kirvano: Assinatura inválida');
        return res.status(401).json({
          success: false,
          error: 'Assinatura inválida'
        });
      }

      // Parse dos dados
      const vendaData = WebhookParser.parseKirvano(req.body);
      
      if (!vendaData) {
        console.log('ℹ️  Webhook Kirvano: Evento ignorado (não é venda aprovada)');
        return res.status(200).json({
          success: true,
          message: 'Evento processado (ignorado)'
        });
      }

      // Processa a venda
      const result = await this.processSale(vendaData);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: result
      });

    } catch (error) {
      console.error('❌ Erro ao processar webhook Kirvano:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar webhook'
      });
    }
  }

  /**
   * Processa venda e gera link de ativação
   * @param {Object} vendaData - Dados padronizados da venda
   * @returns {Promise<Object>} Resultado do processamento
   */
  static async processSale(vendaData) {
    const { email, nome, plataforma, venda_id, dados_completos } = vendaData;

    // Validações básicas
    if (!email) {
      throw new Error('Email não encontrado nos dados da venda');
    }

    // Verifica se o usuário já existe
    const userExists = await User.findByEmail(email);
    if (userExists) {
      console.log(`ℹ️  Usuário já existe: ${email}. Link de ativação não será gerado.`);
      return {
        processed: false,
        reason: 'user_already_exists',
        email: email
      };
    }

    // Verifica se já existe link pendente para este email
    const existingLink = await ActivationLink.findPendingByEmail(email);
    if (existingLink) {
      console.log(`ℹ️  Link pendente já existe para: ${email}. Reutilizando link existente.`);
      
      // Gera URL do link
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const activationUrl = `${appUrl}/ativar/${existingLink.token}`;
      
      // Reenvia email com link existente
      await EmailService.sendActivationLink({
        email: email,
        nome: nome,
        link: activationUrl,
        expiresAt: existingLink.expires_at
      });

      return {
        processed: true,
        action: 'link_resent',
        email: email,
        link_id: existingLink.id
      };
    }

    // Cria novo link de ativação
    const link = await ActivationLink.create({
      email: email,
      nome_cliente: nome,
      plataforma: plataforma,
      venda_id: venda_id,
      venda_data: dados_completos
    }, 168); // Expira em 7 dias (168 horas)

    // Gera URL do link
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const activationUrl = `${appUrl}/ativar/${link.token}`;

    // Envia email com link de ativação
    const emailResult = await EmailService.sendActivationLink({
      email: email,
      nome: nome,
      link: activationUrl,
      expiresAt: link.expires_at
    });

    if (!emailResult.success) {
      console.error('❌ Erro ao enviar email:', emailResult.error);
      // Link foi criado, mas email falhou
      // Em produção, você pode querer implementar retry ou fila
    }

    console.log(`✅ Link de ativação criado para: ${email} (${plataforma})`);

    return {
      processed: true,
      action: 'link_created',
      email: email,
      link_id: link.id,
      email_sent: emailResult.success
    };
  }
}

module.exports = WebhookController;

