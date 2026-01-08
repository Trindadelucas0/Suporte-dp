/**
 * DIAGNÓSTICO COMPLETO DO SISTEMA
 * Verifica todos os componentes críticos
 */

require('dotenv').config();
const db = require('../config/database');
const path = require('path');

async function diagnosticarSistema() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA\n');
  console.log('='.repeat(60));
  
  let problemas = [];
  let avisos = [];
  
  // 1. Verificar conexão com banco
  console.log('\n1️⃣ VERIFICANDO CONEXÃO COM BANCO DE DADOS...');
  try {
    const result = await db.query('SELECT NOW() as agora, version() as versao');
    console.log('✅ Conexão com banco estabelecida');
    console.log(`   PostgreSQL: ${result.rows[0].versao.split(' ')[0]} ${result.rows[0].versao.split(' ')[1]}`);
  } catch (error) {
    console.error('❌ ERRO: Não foi possível conectar ao banco de dados');
    console.error(`   Erro: ${error.message}`);
    problemas.push('Conexão com banco de dados falhou');
    return; // Não continua se não conseguir conectar
  }
  
  // 2. Verificar se tabela users existe
  console.log('\n2️⃣ VERIFICANDO TABELA USERS...');
  try {
    const checkTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!checkTable.rows[0].exists) {
      console.error('❌ ERRO: Tabela users não existe!');
      problemas.push('Tabela users não existe');
    } else {
      console.log('✅ Tabela users existe');
      
      // Verifica colunas da tabela users
      const columns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      console.log(`   Colunas encontradas: ${columns.rows.length}`);
      
      const colunasEsperadas = [
        'id', 'nome', 'email', 'senha_hash', 'is_admin',
        'whatsapp', 'status', 'subscription_status', 'subscription_expires_at',
        'created_at', 'updated_at'
      ];
      
      const colunasExistentes = columns.rows.map(c => c.column_name);
      const colunasFaltando = colunasEsperadas.filter(c => !colunasExistentes.includes(c));
      
      if (colunasFaltando.length > 0) {
        console.warn(`⚠️  Colunas faltando: ${colunasFaltando.join(', ')}`);
        avisos.push(`Colunas faltando na tabela users: ${colunasFaltando.join(', ')}`);
      } else {
        console.log('✅ Todas as colunas esperadas estão presentes');
      }
      
      // Lista todas as colunas
      console.log('\n   Colunas da tabela users:');
      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
      });
    }
  } catch (error) {
    console.error('❌ ERRO ao verificar tabela users:', error.message);
    problemas.push(`Erro ao verificar tabela users: ${error.message}`);
  }
  
  // 3. Verificar migrations
  console.log('\n3️⃣ VERIFICANDO MIGRATIONS...');
  try {
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const fs = require('fs');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('❌ ERRO: Diretório de migrations não encontrado');
      problemas.push('Diretório de migrations não encontrado');
    } else {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`✅ ${migrationFiles.length} migrations encontradas`);
      
      // Verifica se tabela orders existe (necessária para migration 008)
      const checkOrders = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        );
      `);
      
      if (!checkOrders.rows[0].exists && migrationFiles.includes('008_add_subscription_fields_to_users.sql')) {
        console.warn('⚠️  AVISO: Migration 008 referencia tabela orders que não existe');
        console.warn('   A migration 007 (create_orders_and_payments) deve ser executada primeiro');
        avisos.push('Tabela orders não existe - migration 007 pode não ter sido executada');
      }
    }
  } catch (error) {
    console.error('❌ ERRO ao verificar migrations:', error.message);
    problemas.push(`Erro ao verificar migrations: ${error.message}`);
  }
  
  // 4. Verificar se há usuários no banco
  console.log('\n4️⃣ VERIFICANDO USUÁRIOS NO BANCO...');
  try {
    const users = await db.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(users.rows[0].count);
    console.log(`✅ ${count} usuário(s) cadastrado(s)`);
    
    if (count > 0) {
      const sampleUsers = await db.query(`
        SELECT id, nome, email, is_admin, 
               COALESCE(status, 'N/A') as status,
               COALESCE(subscription_status, 'N/A') as subscription_status
        FROM users 
        LIMIT 5
      `);
      
      console.log('\n   Exemplos de usuários:');
      sampleUsers.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.nome}) - Admin: ${user.is_admin} - Status: ${user.status} - Assinatura: ${user.subscription_status}`);
      });
    } else {
      console.warn('⚠️  Nenhum usuário cadastrado. Execute: npm run create-admin');
      avisos.push('Nenhum usuário cadastrado no sistema');
    }
  } catch (error) {
    console.error('❌ ERRO ao verificar usuários:', error.message);
    problemas.push(`Erro ao verificar usuários: ${error.message}`);
  }
  
  // 5. Verificar variáveis de ambiente
  console.log('\n5️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE...');
  const envVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET'];
  const envVarsOpcionais = ['DATABASE_URL', 'NODE_ENV', 'PORT'];
  
  envVars.forEach(varName => {
    if (!process.env[varName]) {
      console.warn(`⚠️  ${varName} não configurada`);
      avisos.push(`Variável de ambiente ${varName} não configurada`);
    } else {
      const value = varName === 'DB_PASSWORD' || varName === 'SESSION_SECRET' 
        ? '*'.repeat(8) 
        : process.env[varName];
      console.log(`✅ ${varName}: ${value}`);
    }
  });
  
  envVarsOpcionais.forEach(varName => {
    if (process.env[varName]) {
      const value = varName === 'DATABASE_URL' 
        ? process.env[varName].substring(0, 30) + '...' 
        : process.env[varName];
      console.log(`ℹ️  ${varName}: ${value}`);
    }
  });
  
  // 6. Testar operações básicas
  console.log('\n6️⃣ TESTANDO OPERAÇÕES BÁSICAS...');
  try {
    // Teste de SELECT
    await db.query('SELECT 1 as test');
    console.log('✅ SELECT funciona');
    
    // Teste de INSERT (rollback)
    const testResult = await db.query(`
      INSERT INTO users (nome, email, senha_hash, is_admin) 
      VALUES ('TESTE', 'teste@teste.com', 'hash_teste', false)
      RETURNING id
    `);
    const testId = testResult.rows[0].id;
    
    // Deleta o registro de teste
    await db.query('DELETE FROM users WHERE id = $1', [testId]);
    console.log('✅ INSERT e DELETE funcionam');
    
  } catch (error) {
    console.error('❌ ERRO ao testar operações:', error.message);
    problemas.push(`Erro ao testar operações: ${error.message}`);
  }
  
  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO DO DIAGNÓSTICO\n');
  
  if (problemas.length === 0 && avisos.length === 0) {
    console.log('✅ SISTEMA OK - Nenhum problema encontrado!');
  } else {
    if (problemas.length > 0) {
      console.log('❌ PROBLEMAS CRÍTICOS ENCONTRADOS:');
      problemas.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
    }
    
    if (avisos.length > 0) {
      console.log('\n⚠️  AVISOS:');
      avisos.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
    }
    
    console.log('\n💡 RECOMENDAÇÕES:');
    if (problemas.some(p => p.includes('users não existe'))) {
      console.log('   1. Execute: npm start (o servidor criará as tabelas automaticamente)');
    }
    if (avisos.some(a => a.includes('Colunas faltando'))) {
      console.log('   2. Execute: npm run migrate-subscription');
      console.log('   3. Ou execute manualmente as migrations em database/migrations/');
    }
    if (avisos.some(a => a.includes('Nenhum usuário'))) {
      console.log('   4. Execute: npm run create-admin');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(problemas.length > 0 ? 1 : 0);
}

diagnosticarSistema().catch(error => {
  console.error('❌ ERRO FATAL no diagnóstico:', error);
  process.exit(1);
});

