/**
 * SCRIPT: Teste de Comunicação com InfinitePay
 * Testa se a API InfinitePay está acessível e funcionando
 * 
 * Executar: node scripts/test-infinitepay-connection.js
 */

require('dotenv').config();
const axios = require('axios');

const HANDLE = process.env.INFINITEPAY_HANDLE || 'lucas-rodrigues-740';
const API_BASE_URL = 'https://api.infinitepay.io';

async function testConnection() {
  console.log('🔍 Testando comunicação com InfinitePay...\n');
  console.log('Configuração:');
  console.log(`  HANDLE: ${HANDLE}`);
  console.log(`  API URL: ${API_BASE_URL}\n`);

  try {
    // Teste 1: Verificar se a API está acessível
    console.log('1️⃣ Testando acessibilidade da API...');
    try {
      const response = await axios.get(`${API_BASE_URL}`, {
        timeout: 10000,
        validateStatus: () => true // Aceita qualquer status
      });
      console.log(`   ✅ API acessível (status: ${response.status})`);
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        console.log('   ❌ Erro: Não foi possível resolver o host');
        console.log('   💡 Verifique sua conexão com a internet');
        return;
      }
      console.log(`   ⚠️  Resposta inesperada: ${error.message}`);
    }

    // Teste 2: Tentar criar um link de checkout (teste completo)
    console.log('\n2️⃣ Testando criação de link de checkout...');
    const testOrderNsu = `test-${Date.now()}`;
    const testPayload = {
      handle: HANDLE,
      items: [
        {
          quantity: 1,
          price: 1990, // R$ 19,90 em centavos
          description: 'Teste de Conexão'
        }
      ],
      order_nsu: testOrderNsu,
      redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/test-redirect`,
      webhook_url: `${process.env.APP_URL || 'http://localhost:3000'}/webhook/infinitepay`
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/invoices/public/checkout/links`,
        testPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('   ✅ Link de checkout criado com sucesso!');
      console.log(`   📋 Invoice Slug: ${response.data?.invoice_slug || 'N/A'}`);
      console.log(`   🔗 Checkout URL: ${response.data?.url || response.data?.checkout_url || 'N/A'}`);
      console.log('\n   📝 Resposta completa:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('   ❌ Erro ao criar link de checkout:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.log('   ⚠️  Erro: Nenhuma resposta recebida');
        console.log(`   💡 Verifique se a API InfinitePay está online`);
      } else {
        console.log(`   Erro: ${error.message}`);
      }
    }

    // Teste 3: Verificar handle
    console.log('\n3️⃣ Verificando HANDLE...');
    if (!HANDLE || HANDLE === 'lucas-rodrigues-740') {
      console.log('   ⚠️  Usando HANDLE padrão');
      console.log('   💡 Configure INFINITEPAY_HANDLE no .env se necessário');
    } else {
      console.log(`   ✅ HANDLE configurado: ${HANDLE}`);
    }

    console.log('\n✅ Teste de comunicação concluído!');
  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  testConnection()
    .then(() => {
      console.log('\n✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = testConnection;

