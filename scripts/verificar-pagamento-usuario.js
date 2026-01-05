/**
 * Script para verificar pagamento de um usuário específico
 * 
 * Uso: node scripts/verificar-pagamento-usuario.js email@exemplo.com
 */

require('dotenv').config();
const db = require('../config/database');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentToken = require('../models/PaymentToken');

async function verificarPagamento(email) {
  try {
    console.log('🔍 VERIFICAÇÃO DE PAGAMENTO');
    console.log('='.repeat(80));
    console.log('Email:', email);
    console.log('');

    // 1. Buscar usuário
    const userResult = await db.query(
      'SELECT id, nome, email, subscription_status, subscription_expires_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('✅ Usuário encontrado:');
    console.log('   ID:', user.id);
    console.log('   Nome:', user.nome);
    console.log('   Email:', user.email);
    console.log('   Subscription Status:', user.subscription_status || 'undefined');
    console.log('   Subscription Expires:', user.subscription_expires_at || 'undefined');
    console.log('');

    // 2. Buscar orders do usuário
    const ordersByUserId = await db.query(
      'SELECT order_nsu, status, customer_email, user_id, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );
    
    const ordersByEmail = await db.query(
      'SELECT order_nsu, status, customer_email, user_id, created_at FROM orders WHERE LOWER(customer_email) = LOWER($1) ORDER BY created_at DESC',
      [email.toLowerCase()]
    );
    
    // Combinar e remover duplicatas
    const allOrders = [...ordersByUserId.rows, ...ordersByEmail.rows];
    const uniqueOrders = allOrders.reduce((acc, order) => {
      if (!acc.find(o => o.order_nsu === order.order_nsu)) {
        acc.push(order);
      }
      return acc;
    }, []);
    
    const ordersResult = { rows: uniqueOrders };

    console.log('📋 Orders encontrados:', ordersResult.rows.length);
    ordersResult.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. Order NSU: ${order.order_nsu}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      Customer Email: ${order.customer_email || 'N/A'}`);
      console.log(`      User ID: ${order.user_id || 'N/A'}`);
      console.log(`      Criado em: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    });

    // 3. Buscar pagamentos por user_id
    const paymentsByUserId = await Payment.findByUserId(user.id);
    console.log('💳 Pagamentos por user_id:', paymentsByUserId.length);
    paymentsByUserId.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment ID: ${payment.id}`);
      console.log(`      Order NSU: ${payment.order_nsu}`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Transaction NSU: ${payment.transaction_nsu}`);
      console.log(`      Paid Amount: R$ ${(payment.paid_amount / 100).toFixed(2)}`);
      console.log(`      Paid At: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString('pt-BR') : 'N/A'}`);
      console.log('');
    });

    // 4. Buscar pagamentos por email (via orders)
    const paymentsByEmail = await db.query(
      `SELECT p.* FROM payments p
       INNER JOIN orders o ON p.order_nsu = o.order_nsu
       WHERE LOWER(o.customer_email) = LOWER($1) AND p.status = 'paid'`,
      [email]
    );

    console.log('💳 Pagamentos por email (JOIN):', paymentsByEmail.rows.length);
    paymentsByEmail.rows.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment ID: ${payment.id}`);
      console.log(`      Order NSU: ${payment.order_nsu}`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Transaction NSU: ${payment.transaction_nsu}`);
      console.log(`      Paid Amount: R$ ${(payment.paid_amount / 100).toFixed(2)}`);
      console.log(`      Paid At: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString('pt-BR') : 'N/A'}`);
      console.log('');
    });

    // 5. Buscar TODOS os pagamentos (qualquer status) - buscar por order_nsu dos orders encontrados
    const orderNsus = uniqueOrders.map(o => o.order_nsu);
    let allPayments = { rows: [] };
    
    if (orderNsus.length > 0) {
      const placeholders = orderNsus.map((_, i) => `$${i + 1}`).join(', ');
      allPayments = await db.query(
        `SELECT p.*, o.customer_email, o.user_id as order_user_id 
         FROM payments p
         LEFT JOIN orders o ON p.order_nsu = o.order_nsu
         WHERE p.order_nsu IN (${placeholders})
         ORDER BY p.created_at DESC`,
        orderNsus
      );
    }

    console.log('💳 TODOS os pagamentos (qualquer status):', allPayments.rows.length);
    allPayments.rows.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment ID: ${payment.id}`);
      console.log(`      Order NSU: ${payment.order_nsu}`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Transaction NSU: ${payment.transaction_nsu}`);
      console.log(`      Paid Amount: R$ ${payment.paid_amount ? (payment.paid_amount / 100).toFixed(2) : 'N/A'}`);
      console.log(`      Paid At: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString('pt-BR') : 'N/A'}`);
      console.log(`      Order Customer Email: ${payment.customer_email || 'N/A'}`);
      console.log(`      Order User ID: ${payment.order_user_id || 'N/A'}`);
      console.log('');
    });

    // 6. Buscar tokens
    const tokens = await PaymentToken.findPendingTokenByEmail(email);
    console.log('🔑 Tokens pendentes:', tokens ? 1 : 0);
    if (tokens) {
      console.log('   Token:', tokens.token);
      console.log('   Order NSU:', tokens.order_nsu);
      console.log('   Used:', tokens.used);
      console.log('   Expires At:', new Date(tokens.expires_at).toLocaleString('pt-BR'));
      console.log('   Created At:', new Date(tokens.created_at).toLocaleString('pt-BR'));
    }

    // 7. Verificar últimos webhooks recebidos (se houver tabela de logs)
    console.log('');
    console.log('📊 RESUMO:');
    console.log('   Orders:', ordersResult.rows.length);
    console.log('   Pagamentos por user_id:', paymentsByUserId.length);
    console.log('   Pagamentos por email:', paymentsByEmail.rows.length);
    console.log('   Todos os pagamentos:', allPayments.rows.length);
    console.log('   Tokens pendentes:', tokens ? 1 : 0);

    if (allPayments.rows.length === 0 && ordersResult.rows.length > 0) {
      console.log('');
      console.log('⚠️ PROBLEMA DETECTADO:');
      console.log('   - Há orders criados mas NENHUM pagamento foi processado');
      console.log('   - Isso indica que o webhook NÃO foi recebido ou NÃO processou corretamente');
      console.log('');
      console.log('💡 SOLUÇÃO:');
      console.log('   1. Verifique os logs do Render para ver se o webhook foi recebido');
      console.log('   2. Verifique se o webhook URL está correto no InfinitePay');
      console.log('   3. Verifique se há erros no processamento do webhook');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Uso: node scripts/verificar-pagamento-usuario.js email@exemplo.com');
  process.exit(1);
}

verificarPagamento(email);

