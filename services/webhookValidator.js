/**
 * SERVIÇO: WebhookValidator
 * Valida assinaturas e origem de webhooks das plataformas
 * 
 * ⚠️ IMPORTANTE: Configure os segredos no .env:
 * KIWIFY_WEBHOOK_SECRET=seu-secret-kiwify
 * HOTMART_WEBHOOK_SECRET=seu-secret-hotmart
 * KIRVANO_WEBHOOK_SECRET=seu-secret-kirvano
 */

const crypto = require('crypto');

class WebhookValidator {
  /**
   * Valida webhook da Kiwify
   * @param {Object} req - Request do Express
   * @param {string} body - Corpo da requisição (string)
   * @returns {boolean} Válido ou não
   */
  static validateKiwify(req, body) {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️  KIWIFY_WEBHOOK_SECRET não configurado');
      return false;
    }

    // Kiwify envia assinatura no header X-Kiwify-Signature
    const signature = req.headers['x-kiwify-signature'];
    
    if (!signature) {
      return false;
    }

    // Calcula HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest('hex');

    // Compara assinaturas de forma segura (timing-safe)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  /**
   * Valida webhook da Hotmart
   * @param {Object} req - Request do Express
   * @param {string} body - Corpo da requisição (string)
   * @returns {boolean} Válido ou não
   */
  static validateHotmart(req, body) {
    const secret = process.env.HOTMART_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️  HOTMART_WEBHOOK_SECRET não configurado');
      return false;
    }

    // Hotmart envia assinatura no header X-Hotmart-Hmac-Sha256
    const signature = req.headers['x-hotmart-hmac-sha256'];
    
    if (!signature) {
      return false;
    }

    // Calcula HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest('hex');

    // Compara assinaturas de forma segura
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  /**
   * Valida webhook da Kirvano
   * @param {Object} req - Request do Express
   * @param {string} body - Corpo da requisição (string)
   * @returns {boolean} Válido ou não
   */
  static validateKirvano(req, body) {
    const secret = process.env.KIRVANO_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️  KIRVANO_WEBHOOK_SECRET não configurado');
      return false;
    }

    // Kirvano envia assinatura no header X-Kirvano-Signature
    const signature = req.headers['x-kirvano-signature'];
    
    if (!signature) {
      return false;
    }

    // Calcula HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest('hex');

    // Compara assinaturas de forma segura
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }

  /**
   * Valida webhook baseado na plataforma
   * @param {string} platform - Plataforma (kiwify, hotmart, kirvano)
   * @param {Object} req - Request do Express
   * @param {string} body - Corpo da requisição (string)
   * @returns {boolean} Válido ou não
   */
  static validate(platform, req, body) {
    switch (platform.toLowerCase()) {
      case 'kiwify':
        return this.validateKiwify(req, body);
      case 'hotmart':
        return this.validateHotmart(req, body);
      case 'kirvano':
        return this.validateKirvano(req, body);
      default:
        console.error(`❌ Plataforma desconhecida: ${platform}`);
        return false;
    }
  }
}

module.exports = WebhookValidator;

