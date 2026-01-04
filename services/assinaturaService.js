/**
 * SERVICE: AssinaturaService
 * Gerencia assinatura direta sem login (fluxo da landing page)
 */

const db = require('../config/database');
const InfinitePayProvider = require('../providers/infinitepay.provider');
const Cobranca = require('../models/Cobranca');
const crypto = require('crypto');

class AssinaturaService {
  /**
   * Cria assinatura direta (sem login) - para landing page
   * Cria usuário temporário e redireciona para InfinitePay
   * 
   * @param {Object} dadosCliente - Dados do cliente (email, nome, telefone)
   * @returns {Promise<Object>} Link de pagamento e dados da cobrança
   */
  async criarAssinaturaDireta(dadosCliente) {
    const { email, nome, telefone } = dadosCliente;

    if (!email) {
      throw new Error('Email é obrigatório');
    }

    // Verifica se já existe usuário com este email
    let usuario = await db.query(
      'SELECT id, nome, email, senha_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    let userId;

    if (usuario.rows.length > 0) {
      // Usuário já existe
      userId = usuario.rows[0].id;
      console.log(`📋 Usuário existente encontrado: ${userId}`);
    } else {
      // Cria usuário temporário (sem senha)
      const novoUsuario = await db.query(
        `INSERT INTO users (nome, email, telefone, senha_hash, ativo, is_admin, bloqueado, bloqueado_pagamento, created_at)
         VALUES ($1, $2, $3, '', true, false, false, false, CURRENT_TIMESTAMP)
         RETURNING id, nome, email`,
        [nome || 'Cliente', email.toLowerCase().trim(), telefone || null]
      );

      userId = novoUsuario.rows[0].id;
      console.log(`✅ Usuário temporário criado: ${userId} - ${email}`);
    }

    // Calcula data de vencimento (próximo mês, dia 10)
    const hoje = new Date();
    const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 10);
    const mesReferencia = `${dataVencimento.getFullYear()}-${String(dataVencimento.getMonth() + 1).padStart(2, '0')}`;

    // Verifica se já existe cobrança para este mês
    const cobrancaExistente = await Cobranca.findByUserAndMonth(userId, mesReferencia);
    if (cobrancaExistente && cobrancaExistente.link_pagamento) {
      console.log(`⚠️  Cobrança já existe para usuário ${userId} no mês ${mesReferencia}`);
      return {
        success: true,
        link_pagamento: cobrancaExistente.link_pagamento,
        cobranca_id: cobrancaExistente.id,
        user_id: userId
      };
    }

    // Valor da mensalidade
    const valor = parseFloat(process.env.VALOR_MENSALIDADE || 19.90);

    // Cria cobrança no InfinitePay
    let externalId = null;
    let linkPagamento = null;
    let status = 'pendente';

    try {
      const chargeResult = await InfinitePayProvider.createCharge({
        valor: valor,
        descricao: `Mensalidade ${mesReferencia} - ${process.env.APP_NAME || 'Suporte DP'}`,
        dataVencimento: dataVencimento,
        emailCliente: email,
        nomeCliente: nome || 'Cliente',
        referenceId: `user_${userId}_${mesReferencia}`
      });

      console.log('📦 Resultado do InfinitePay:', {
        success: chargeResult.success,
        external_id: chargeResult.external_id,
        link_pagamento: chargeResult.link_pagamento ? 'Existe' : 'NÃO EXISTE',
        status: chargeResult.status
      });

      externalId = chargeResult.external_id;
      linkPagamento = chargeResult.link_pagamento;
      status = chargeResult.status;

      if (!linkPagamento) {
        throw new Error('API InfinitePay não retornou link de pagamento');
      }
    } catch (error) {
      console.error(`❌ Erro ao criar cobrança no InfinitePay:`, error.message);
      throw new Error(`Não foi possível gerar link de pagamento: ${error.message}`);
    }

    // Cria cobrança no banco
    const cobranca = await Cobranca.create({
      user_id: userId,
      external_id: externalId,
      valor: valor,
      status: status,
      data_vencimento: dataVencimento,
      link_pagamento: linkPagamento,
      mes_referencia: mesReferencia
    });

    console.log(`✅ Assinatura direta criada - Usuário: ${userId}, Cobrança: ${cobranca.id}`);

    return {
      success: true,
      link_pagamento: linkPagamento,
      cobranca_id: cobranca.id,
      user_id: userId,
      external_id: externalId
    };
  }
}

module.exports = new AssinaturaService();

