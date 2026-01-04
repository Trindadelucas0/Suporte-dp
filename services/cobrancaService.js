/**
 * SERVICE: CobrancaService
 * Lógica de negócio para cobranças recorrentes
 */

const Cobranca = require('../models/Cobranca');
const User = require('../models/User');
const InfinitePayProvider = require('../providers/infinitepay.provider');
const db = require('../config/database');

class CobrancaService {
  /**
   * Gera cobrança mensal para um usuário
   * @param {string} userId - ID do usuário
   * @param {Date} dataVencimento - Data de vencimento
   * @returns {Promise<Object>} Cobrança criada
   */
  async gerarCobrancaMensal(userId, dataVencimento = null) {
    // Calcula data de vencimento (próximo mês, dia 10)
    if (!dataVencimento) {
      const hoje = new Date();
      dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 10);
    }

    // Formata mês de referência (YYYY-MM)
    const mesReferencia = this.formatMesReferencia(dataVencimento);

    // Verifica se já existe cobrança para este mês
    const cobrancaExistente = await Cobranca.findByUserAndMonth(userId, mesReferencia);
    if (cobrancaExistente) {
      console.log(`⚠️  Cobrança já existe para usuário ${userId} no mês ${mesReferencia}`);
      return cobrancaExistente;
    }

    // Busca dados do usuário
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
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
        emailCliente: user.email,
        nomeCliente: user.nome,
        referenceId: `user_${userId}_${mesReferencia}`
      });

      console.log('📦 Resultado do InfinitePay:', {
        success: chargeResult.success,
        external_id: chargeResult.external_id,
        link_pagamento: chargeResult.link_pagamento ? 'Existe' : 'NÃO EXISTE',
        link_pagamento_valor: chargeResult.link_pagamento || 'null',
        status: chargeResult.status,
        useMock: chargeResult.data?.mock || false
      });

      externalId = chargeResult.external_id;
      linkPagamento = chargeResult.link_pagamento;
      status = chargeResult.status;

      if (!linkPagamento) {
        console.error('❌ Link de pagamento é null/undefined:', {
          chargeResult: chargeResult,
          temLinkPagamento: !!chargeResult.link_pagamento,
          tipo: typeof chargeResult.link_pagamento
        });
        throw new Error('API InfinitePay não retornou link de pagamento. Verifique os logs para mais detalhes.');
      }
    } catch (error) {
      console.error(`❌ Erro ao criar cobrança no InfinitePay para usuário ${userId}:`, {
        message: error.message,
        stack: error.stack,
        userId: userId,
        valor: valor,
        mesReferencia: mesReferencia,
        handle: process.env.INFINITEPAY_HANDLE,
        useMock: process.env.INFINITEPAY_USE_MOCK,
        appUrl: process.env.APP_URL
      });
      
      // Mensagem de erro mais útil
      let errorMessage = 'Não foi possível gerar link de pagamento.';
      
      if (error.message.includes('InfinitePay retornou erro')) {
        errorMessage += ' A API do InfinitePay retornou um erro. Verifique se o handle está correto e se a API está funcionando.';
      } else if (error.message.includes('Sem resposta')) {
        errorMessage += ' Não foi possível conectar com a API do InfinitePay. Verifique sua conexão.';
      } else if (error.message.includes('não retornou link')) {
        errorMessage += ' A API do InfinitePay não retornou o link de pagamento. Verifique a configuração.';
      } else {
        errorMessage += ` ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }

    // Valida se tem link de pagamento antes de criar no banco
    if (!linkPagamento) {
      throw new Error('Link de pagamento não foi gerado. Verifique a configuração do InfinitePay.');
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

    // Atualiza dados do usuário
    await db.query(
      `UPDATE users 
       SET data_ultima_cobranca = CURRENT_DATE,
           data_proximo_vencimento = $1
       WHERE id = $2`,
      [dataVencimento, userId]
    );

    console.log(`✅ Cobrança criada para usuário ${userId} - Mês: ${mesReferencia}`);
    return cobranca;
  }

  /**
   * Gera cobranças mensais para todos os usuários ativos
   * @returns {Promise<Array>} Lista de cobranças criadas
   */
  async gerarCobrancasMensais() {
    console.log('🔄 Iniciando geração de cobranças mensais...');

    // Busca todos os usuários ativos (não bloqueados por pagamento)
    const users = await db.query(
      `SELECT id FROM users 
       WHERE (bloqueado_pagamento = FALSE OR bloqueado_pagamento IS NULL)
       AND (ativo = TRUE OR ativo IS NULL)`
    );

    const cobrancas = [];
    const hoje = new Date();
    const dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 10);

    for (const user of users.rows) {
      try {
        const cobranca = await this.gerarCobrancaMensal(user.id, dataVencimento);
        cobrancas.push(cobranca);
      } catch (error) {
        console.error(`❌ Erro ao gerar cobrança para usuário ${user.id}:`, error.message);
      }
    }

    console.log(`✅ ${cobrancas.length} cobranças geradas`);
    return cobrancas;
  }

  /**
   * Processa pagamento confirmado
   * @param {string} externalId - ID externo da cobrança
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processarPagamento(externalId) {
    const cobranca = await Cobranca.findByExternalId(externalId);
    
    if (!cobranca) {
      throw new Error('Cobrança não encontrada');
    }

    if (cobranca.status === 'paga') {
      console.log(`⚠️  Cobrança ${cobranca.id} já está paga`);
      return cobranca;
    }

    // Marca como paga
    await Cobranca.markAsPaid(cobranca.id);

    // Desbloqueia usuário se estiver bloqueado
    await db.query(
      'UPDATE users SET bloqueado_pagamento = FALSE WHERE id = $1',
      [cobranca.user_id]
    );

    console.log(`✅ Pagamento processado para cobrança ${cobranca.id}`);
    return await Cobranca.findById(cobranca.id);
  }

  /**
   * Formata mês de referência (YYYY-MM)
   * @param {Date} date - Data
   * @returns {string} Mês formatado
   */
  formatMesReferencia(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Busca cobranças pendentes que precisam de atenção
   * @returns {Promise<Object>} Cobranças agrupadas
   */
  async getCobrancasPendentes() {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    // Cobranças vencendo hoje
    const vencendoHoje = await db.query(
      `SELECT * FROM cobrancas 
       WHERE status = 'pendente' 
       AND data_vencimento = $1`,
      [hojeStr]
    );

    // Cobranças vencidas
    const vencidas = await Cobranca.findOverdue(hojeStr);

    // Cobranças vencendo em 2 dias
    const doisDias = new Date(hoje);
    doisDias.setDate(doisDias.getDate() + 2);
    const vencendo2Dias = await db.query(
      `SELECT * FROM cobrancas 
       WHERE status = 'pendente' 
       AND data_vencimento = $1`,
      [doisDias.toISOString().split('T')[0]]
    );

    // Cobranças vencendo em 5 dias
    const cincoDias = new Date(hoje);
    cincoDias.setDate(cincoDias.getDate() + 5);
    const vencendo5Dias = await db.query(
      `SELECT * FROM cobrancas 
       WHERE status = 'pendente' 
       AND data_vencimento = $1`,
      [cincoDias.toISOString().split('T')[0]]
    );

    return {
      vencendoHoje: vencendoHoje.rows,
      vencendo2Dias: vencendo2Dias.rows,
      vencendo5Dias: vencendo5Dias.rows,
      vencidas: vencidas
    };
  }
}

module.exports = new CobrancaService();

