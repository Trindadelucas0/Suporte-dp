/**
 * CONTROLLER: WebhookController
 * Processa webhooks do InfinitePay
 */

const InfinitePayProvider = require('../providers/infinitepay.provider');
const cobrancaService = require('../services/cobrancaService');
const bloqueioService = require('../services/bloqueioService');
const cadastroService = require('../services/cadastroService');
const Cobranca = require('../models/Cobranca');
const db = require('../config/database');

class WebhookController {
  /**
   * Processa webhook do InfinitePay
   */
  static async infinitepay(req, res) {
    try {
      const payload = req.body;
      const signature = req.headers['x-signature'] || req.headers['x-infinitepay-signature'];

      // Valida assinatura (se configurado)
      if (!InfinitePayProvider.validateWebhook(signature, payload)) {
        console.warn('⚠️  Webhook com assinatura inválida');
        return res.status(401).json({ error: 'Assinatura inválida' });
      }

      // Processa webhook
      const webhookData = InfinitePayProvider.parseWebhook(payload);

      console.log('📥 Webhook recebido:', {
        event: webhookData.event,
        external_id: webhookData.external_id,
        status: webhookData.status
      });

      // Busca cobrança pelo external_id
      const cobranca = await Cobranca.findByExternalId(webhookData.external_id);

      if (!cobranca) {
        console.warn(`⚠️  Cobrança não encontrada para external_id: ${webhookData.external_id}`);
        return res.status(404).json({ error: 'Cobrança não encontrada' });
      }

      // Processa evento
      if (webhookData.status === 'paga' || webhookData.event === 'payment.paid') {
        // Processa pagamento usando order_nsu (que é nosso external_id)
        const orderNsu = webhookData.order_nsu || webhookData.external_id;
        await cobrancaService.processarPagamento(orderNsu);

        // Busca usuário para verificar se já tem conta
        // Precisa buscar com senha_hash para verificar
        const userWithPassword = await db.query(
          'SELECT id, nome, email, senha_hash FROM users WHERE id = $1',
          [cobranca.user_id]
        );
        
        if (userWithPassword.rows.length > 0) {
          const user = userWithPassword.rows[0];
          // Verifica se usuário já tem senha (já está cadastrado)
          const userHasPassword = user.senha_hash && user.senha_hash.length > 0;
          
          if (userHasPassword) {
            // Usuário já cadastrado: libera acesso e envia link de ativação
            await bloqueioService.liberarAcesso(cobranca.user_id);
            console.log(`✅ Pagamento processado e acesso liberado para usuário ${cobranca.user_id}`);
          } else {
            // Usuário ainda não se cadastrou: envia link de cadastro
            const linkCadastro = await cadastroService.gerarLinkCadastro(user.email, user.nome);
            await cadastroService.enviarEmailCadastro(user.email, user.nome, linkCadastro);
            console.log(`📧 Link de cadastro enviado para ${user.email}`);
          }
        } else {
          console.warn(`⚠️  Usuário ${cobranca.user_id} não encontrado`);
        }
      } else if (webhookData.status === 'vencida' || webhookData.event === 'payment.overdue') {
        // Marca como vencida
        await Cobranca.markAsOverdue(cobranca.id);
        console.log(`⚠️  Cobrança ${cobranca.id} marcada como vencida`);
      } else if (webhookData.status === 'cancelada' || webhookData.event === 'payment.cancelled') {
        // Atualiza status
        await Cobranca.update(cobranca.id, { status: 'cancelada' });
        console.log(`❌ Cobrança ${cobranca.id} cancelada`);
      }

      // Responde ao InfinitePay
      res.status(200).json({ success: true, message: 'Webhook processado' });
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }

  /**
   * Testa webhook (endpoint de teste)
   */
  static async test(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Endpoint de teste desabilitado em produção' });
    }

    const { external_id, status } = req.body;

    if (!external_id) {
      return res.status(400).json({ error: 'external_id é obrigatório' });
    }

    try {
      // Simula webhook
      const webhookData = {
        event: 'payment.paid',
        external_id: external_id,
        status: status || 'paga'
      };

      const cobranca = await Cobranca.findByExternalId(external_id);

      if (!cobranca) {
        return res.status(404).json({ error: 'Cobrança não encontrada' });
      }

      // Processa pagamento
      await cobrancaService.processarPagamento(external_id);
      await bloqueioService.liberarAcesso(cobranca.user_id);

      res.json({
        success: true,
        message: 'Webhook de teste processado',
        cobranca: await Cobranca.findById(cobranca.id)
      });
    } catch (error) {
      console.error('Erro ao processar webhook de teste:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = WebhookController;

