/**
 * Script de Validação de Pagamento e Cadastro
 * 
 * Este script testa se o sistema está recebendo e processando
 * corretamente os dados do InfinitePay após o pagamento.
 * 
 * Uso:
 *   node scripts/test-payment-validation.js [order_nsu]
 */

require('dotenv').config();
const db = require('../config/database');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const User = require('../models/User');

async function testPaymentValidation(orderNsu) {
  console.log('\n🔍 Testando Validação de Pagamento e Cadastro...\n');

  try {
    // 1. Verificar se order_nsu foi fornecido
    if (!orderNsu) {
      console.log('⚠️  Nenhum order_nsu fornecido. Verificando últimos pedidos...\n');
      
      // Busca últimos 5 pedidos
      const recentOrders = await db.query(
        `SELECT order_nsu, status, valor, created_at, user_id 
         FROM orders 
         ORDER BY created_at DESC 
         LIMIT 5`
      );

      if (recentOrders.rows.length === 0) {
        console.log('❌ Nenhum pedido encontrado no banco de dados.');
        console.log('\n💡 Uso: node scripts/test-payment-validation.js <order_nsu>');
        process.exit(1);
      }

      console.log('📋 Últimos pedidos encontrados:');
      recentOrders.rows.forEach((order, index) => {
        console.log(`   ${index + 1}. Order NSU: ${order.order_nsu}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Valor: R$ ${parseFloat(order.valor).toFixed(2)}`);
        console.log(`      Criado em: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
        console.log(`      User ID: ${order.user_id || 'N/A'}`);
        console.log('');
      });

      orderNsu = recentOrders.rows[0].order_nsu;
      console.log(`\n✅ Usando order_nsu mais recente: ${orderNsu}\n`);
    }

    console.log('='.repeat(80));
    console.log(`📦 ANALISANDO ORDER NSU: ${orderNsu}`);
    console.log('='.repeat(80));

    // 2. Verificar Order no banco
    console.log('\n1️⃣  Verificando Order no banco de dados...');
    const order = await Order.findByOrderNsu(orderNsu);
    
    if (!order) {
      console.log('   ❌ Order não encontrado no banco de dados!');
      console.log('   💡 Verifique se o order_nsu está correto.');
      process.exit(1);
    }

    console.log('   ✅ Order encontrado!');
    console.log(`   📊 Status: ${order.status}`);
    console.log(`   💰 Valor: R$ ${parseFloat(order.valor).toFixed(2)}`);
    console.log(`   📅 Criado em: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
    console.log(`   🔗 Checkout URL: ${order.checkout_url ? 'Configurado' : 'N/A'}`);
    console.log(`   👤 User ID: ${order.user_id || 'N/A (aguardando cadastro)'}`);

    // 3. Verificar Payments relacionados
    console.log('\n2️⃣  Verificando Pagamentos relacionados...');
    const payments = await db.query(
      'SELECT * FROM payments WHERE order_nsu = $1 ORDER BY created_at DESC',
      [orderNsu]
    );

    if (payments.rows.length === 0) {
      console.log('   ⚠️  Nenhum pagamento encontrado para este order_nsu.');
      console.log('   💡 Isso pode significar:');
      console.log('      - Pagamento ainda não foi processado pelo webhook');
      console.log('      - Webhook ainda não foi chamado pelo InfinitePay');
      console.log('      - Pagamento não foi aprovado');
    } else {
      console.log(`   ✅ ${payments.rows.length} pagamento(s) encontrado(s):\n`);
      
      payments.rows.forEach((payment, index) => {
        console.log(`   📄 Pagamento ${index + 1}:`);
        console.log(`      ID: ${payment.id}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Transaction NSU: ${payment.transaction_nsu || 'N/A'}`);
        console.log(`      Valor Pago: R$ ${parseFloat(payment.paid_amount || 0).toFixed(2)}`);
        console.log(`      Método: ${payment.capture_method || 'N/A'}`);
        console.log(`      Pago em: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString('pt-BR') : 'N/A'}`);
        console.log(`      Próxima Cobrança: ${payment.next_billing_date ? new Date(payment.next_billing_date).toLocaleDateString('pt-BR') : 'N/A'}`);
        console.log(`      User ID: ${payment.user_id || 'N/A (não vinculado)'}`);
        console.log(`      Receipt URL: ${payment.receipt_url ? 'Disponível' : 'N/A'}`);
        console.log('');
      });
    }

    // 4. Verificar se usuário existe para este order_nsu
    console.log('3️⃣  Verificando Usuário relacionado...');
    const user = await User.findByOrderNsu(orderNsu);
    
    if (!user) {
      console.log('   ⚠️  Nenhum usuário encontrado para este order_nsu.');
      console.log('   💡 O usuário ainda não completou o cadastro em /register');
      console.log('   ✅ Isso é normal se o pagamento foi recente.');
    } else {
      console.log('   ✅ Usuário encontrado!');
      console.log(`   👤 Nome: ${user.nome}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📱 WhatsApp: ${user.whatsapp || 'N/A'}`);
      console.log(`   🔑 Admin: ${user.is_admin ? 'Sim' : 'Não'}`);
      console.log(`   📊 Status: ${user.status}`);
      console.log(`   🔒 Bloqueado: ${user.bloqueado ? 'Sim' : 'Não'}`);
      console.log(`   💳 Status Assinatura: ${user.subscription_status || 'N/A'}`);
      console.log(`   📅 Expira em: ${user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A'}`);
      console.log(`   🕐 Último Login: ${user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}`);
      
      // Verificar se subscription está ativa
      if (user.subscription_expires_at) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const expiracao = new Date(user.subscription_expires_at);
        expiracao.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((expiracao - hoje) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes > 0) {
          console.log(`   ✅ Assinatura ATIVA (${diasRestantes} dias restantes)`);
        } else {
          console.log(`   ⚠️  Assinatura EXPIRADA (${Math.abs(diasRestantes)} dias atrás)`);
        }
      }
    }

    // 5. Verificar pagamentos vinculados ao usuário (se existir)
    if (user) {
      console.log('\n4️⃣  Verificando todos os pagamentos do usuário...');
      const userPayments = await Payment.findByUserId(user.id);
      
      if (userPayments.length === 0) {
        console.log('   ⚠️  Nenhum pagamento vinculado ao usuário.');
      } else {
        console.log(`   ✅ ${userPayments.length} pagamento(s) vinculado(s) ao usuário:\n`);
        
        userPayments.forEach((payment, index) => {
          console.log(`   💳 Pagamento ${index + 1}:`);
          console.log(`      Order NSU: ${payment.order_nsu}`);
          console.log(`      Status: ${payment.status}`);
          console.log(`      Valor: R$ ${parseFloat(payment.paid_amount || 0).toFixed(2)}`);
          console.log(`      Data: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString('pt-BR') : 'N/A'}`);
          console.log('');
        });
      }
    }

    // 6. Resumo e Validações
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO E VALIDAÇÕES');
    console.log('='.repeat(80));

    const validacoes = [];

    // Validação 1: Order existe
    validacoes.push({
      nome: 'Order existe no banco',
      status: order ? '✅' : '❌',
      mensagem: order ? 'Order encontrado' : 'Order não encontrado'
    });

    // Validação 2: Payment existe (se order está paid)
    if (order.status === 'paid') {
      const temPayment = payments.rows.length > 0;
      validacoes.push({
        nome: 'Payment processado (webhook)',
        status: temPayment ? '✅' : '❌',
        mensagem: temPayment ? 'Webhook processou o pagamento' : 'Webhook ainda não processou'
      });
    }

    // Validação 3: Payment está paid
    if (payments.rows.length > 0) {
      const paymentPago = payments.rows.some(p => p.status === 'paid');
      validacoes.push({
        nome: 'Payment com status "paid"',
        status: paymentPago ? '✅' : '⚠️',
        mensagem: paymentPago ? 'Payment confirmado' : 'Payment não confirmado'
      });
    }

    // Validação 4: User existe (se order está paid)
    if (order.status === 'paid') {
      validacoes.push({
        nome: 'Usuário cadastrado',
        status: user ? '✅' : '⚠️',
        mensagem: user ? `Usuário: ${user.email}` : 'Aguardando cadastro em /register'
      });
    }

    // Validação 5: User vinculado ao payment
    if (user && payments.rows.length > 0) {
      const paymentVinculado = payments.rows.some(p => p.user_id === user.id);
      validacoes.push({
        nome: 'Payment vinculado ao usuário',
        status: paymentVinculado ? '✅' : '⚠️',
        mensagem: paymentVinculado ? 'Vinculação correta' : 'Payment não vinculado ao usuário'
      });
    }

    // Validação 6: Subscription ativa (se user existe)
    if (user) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      let expiracao = null;
      if (user.subscription_expires_at) {
        expiracao = new Date(user.subscription_expires_at);
        expiracao.setHours(0, 0, 0, 0);
      }
      const ativa = expiracao && expiracao >= hoje && user.subscription_status === 'ativa';
      validacoes.push({
        nome: 'Assinatura ativa',
        status: ativa ? '✅' : '⚠️',
        mensagem: ativa ? 'Assinatura válida' : 'Assinatura expirada ou inativa'
      });
    }

    // Exibir validações
    validacoes.forEach((validacao, index) => {
      console.log(`\n${index + 1}. ${validacao.nome}`);
      console.log(`   ${validacao.status} ${validacao.mensagem}`);
    });

    // 7. Próximos passos
    console.log('\n' + '='.repeat(80));
    console.log('💡 PRÓXIMOS PASSOS');
    console.log('='.repeat(80));

    if (order.status === 'pending') {
      console.log('\n⚠️  Order ainda está pendente.');
      console.log('   1. Aguarde o pagamento no InfinitePay');
      console.log('   2. Verifique se o webhook foi chamado');
      console.log('   3. Execute este script novamente após alguns minutos');
    } else if (order.status === 'paid' && !user) {
      console.log('\n✅ Pagamento confirmado, mas usuário ainda não se cadastrou.');
      console.log('   1. Usuário deve acessar: /register?order_nsu=' + orderNsu);
      console.log('   2. Preencher formulário de cadastro');
      console.log('   3. Sistema criará usuário e vinculará ao payment');
    } else if (order.status === 'paid' && user) {
      console.log('\n✅ Fluxo completo concluído!');
      console.log('   - Order: ✅ Pago');
      console.log('   - Payment: ✅ Processado');
      console.log('   - Usuário: ✅ Cadastrado');
      console.log('   - Assinatura: ' + (user.subscription_status === 'ativa' ? '✅ Ativa' : '⚠️ Verificar'));
    }

    console.log('\n✅ Teste concluído!\n');

  } catch (error) {
    console.error('\n❌ Erro ao executar teste:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar teste
const orderNsu = process.argv[2];
testPaymentValidation(orderNsu);



