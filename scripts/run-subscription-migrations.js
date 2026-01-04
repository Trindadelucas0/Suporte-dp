/**
 * SCRIPT: Executar Migrations de Assinatura
 * Executa as migrations 007 e 008 (orders, payments, subscription fields)
 * 
 * Execute: node scripts/run-subscription-migrations.js
 */

require('dotenv').config();
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🔄 Executando migrations de assinatura...\n');

    // Migration 007: Orders e Payments
    console.log('📦 Executando migration 007 (orders e payments)...');
    const migration007 = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', '007_create_orders_and_payments.sql'),
      'utf8'
    );
    
    try {
      await db.query(migration007);
      console.log('✅ Migration 007 executada com sucesso!');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⚠️  Tabelas já existem (isso é normal se já executou antes)');
      } else {
        throw error;
      }
    }

    // Migration 008: Subscription fields
    console.log('\n📦 Executando migration 008 (campos de assinatura)...');
    const migration008 = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', '008_add_subscription_fields_to_users.sql'),
      'utf8'
    );
    
    try {
      await db.query(migration008);
      console.log('✅ Migration 008 executada com sucesso!');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate') || error.message.includes('column') && error.message.includes('already')) {
        console.log('⚠️  Campos já existem (isso é normal se já executou antes)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Todas as migrations foram executadas!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Inicie o servidor: npm start');
    console.log('   2. Acesse: http://localhost:3000/admin');
    console.log('   3. Faça login com usuário admin');
    console.log('   4. Acesse: http://localhost:3000/admin/usuarios');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    console.error('Detalhes:', error.message);
    process.exit(1);
  }
}

runMigrations();

