/**
 * SCRIPT: Gerar Tokens para Todos os Usuários
 * Gera tokens para todos os usuários que têm pagamentos confirmados mas não têm token pendente válido
 * 
 * Executar manualmente:
 * node scripts/gerar-tokens-para-usuarios.js
 * 
 * Este script:
 * 1. Busca todos os pagamentos confirmados (status = 'paid')
 * 2. Para cada pagamento, verifica se há token pendente válido
 * 3. Se não houver, gera novo token e envia email
 */

require('dotenv').config();
const db = require('../config/database');
const PaymentToken = require('../models/PaymentToken');
const emailService = require('../services/emailService');

async function gerarTokensParaUsuarios() {
  try {
    console.log('🔄 Iniciando geração de tokens para usuários...\n');

    // 1. Busca todos os pagamentos confirmados com seus orders e usuários
    const paymentsResult = await db.query(`
      SELECT DISTINCT ON (p.order_nsu)
        p.id,
        p.order_nsu,
        COALESCE(p.user_id, o.user_id) as user_id,
        p.paid_amount,
        p.paid_at,
        COALESCE(o.customer_email, u.email) as customer_email,
        u.email as user_email,
        u.nome as user_nome
      FROM payments p
      LEFT JOIN orders o ON p.order_nsu = o.order_nsu
      LEFT JOIN users u ON COALESCE(p.user_id, o.user_id) = u.id
      WHERE p.status = 'paid'
      ORDER BY p.order_nsu, p.paid_at DESC
    `);

    const payments = paymentsResult.rows;
    console.log(`📊 Encontrados ${payments.length} pagamento(s) confirmado(s)\n`);

    if (payments.length === 0) {
      console.log('✅ Nenhum pagamento confirmado encontrado.');
      // Só encerra o processo se executado diretamente (não quando importado como módulo)
      if (require.main === module) {
        process.exit(0);
      }
      return; // Retorna sem encerrar se chamado como módulo
    }

    let tokensGerados = 0;
    let tokensJaExistentes = 0;
    let erros = 0;

    // 2. Para cada pagamento, verifica se há token pendente válido
    for (const payment of payments) {
      try {
        const email = payment.user_email || payment.customer_email;

        if (!email) {
          console.log(`⚠️  Pagamento ${payment.order_nsu} sem email - pulando`);
          continue;
        }

        // Verifica se já existe token pendente válido
        const tokenPendente = await PaymentToken.findPendingTokenByEmail(email);

        if (tokenPendente) {
          console.log(`✅ Usuário ${email} já possui token pendente válido`);
          tokensJaExistentes++;
          continue;
        }

        // Verifica se já existe token usado para este order_nsu (evita duplicar)
        const tokensExistentes = await PaymentToken.findByOrderNsu(payment.order_nsu);
        if (tokensExistentes && tokensExistentes.length > 0) {
          console.log(`⚠️  Order ${payment.order_nsu} já possui token (usado ou expirado) - gerando novo`);
        }

        // Gera novo token
        console.log(`🔄 Gerando token para: ${email} (order: ${payment.order_nsu})`);

        const paymentToken = await PaymentToken.create(
          payment.order_nsu,
          email,
          payment.user_id || null
        );

        console.log(`   ✅ Token gerado: ${paymentToken.token}`);

        // Envia email com token
        const valorReais = parseFloat(payment.paid_amount) / 100;
        const nome = payment.user_nome || email.split('@')[0] || 'Cliente';

        const emailResult = await emailService.sendPaymentToken({
          email: email,
          token: paymentToken.token,
          nome: nome,
          orderNsu: payment.order_nsu,
          valor: valorReais
        });

        if (emailResult.success) {
          console.log(`   ✅ Email enviado com sucesso para ${email}`);
          tokensGerados++;
        } else {
          console.log(`   ⚠️  Token gerado mas email não enviado: ${emailResult.error}`);
          tokensGerados++; // Token foi gerado, mesmo que email não tenha sido enviado
        }

        console.log(''); // Linha em branco para separar

      } catch (error) {
        console.error(`❌ Erro ao processar pagamento ${payment.order_nsu}:`, error.message);
        erros++;
      }
    }

    // 3. Resumo
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO:');
    console.log('='.repeat(50));
    console.log(`✅ Tokens gerados e emails enviados: ${tokensGerados}`);
    console.log(`ℹ️  Tokens já existentes (pulados): ${tokensJaExistentes}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Total processado: ${payments.length}`);
    console.log('='.repeat(50));

    // Só encerra o processo se executado diretamente (não quando importado como módulo)
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erro ao gerar tokens para usuários:', error);
    console.error('Stack:', error.stack);
    // Só encerra o processo se executado diretamente (não quando importado como módulo)
    if (require.main === module) {
      process.exit(1);
    }
    // Se chamado como módulo, relança o erro para ser tratado pelo chamador
    throw error;
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  gerarTokensParaUsuarios();
}

// Exporta função para uso em outros scripts
module.exports = gerarTokensParaUsuarios;

