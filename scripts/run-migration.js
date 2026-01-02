/**
 * SCRIPT: Executar Migration
 * Executa uma migration específica no banco de dados
 * 
 * Uso: node scripts/run-migration.js <nome-do-arquivo>
 * Exemplo: node scripts/run-migration.js 005_create_activation_links.sql
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Erro: Nome do arquivo de migration não fornecido');
    console.log('💡 Uso: node scripts/run-migration.js <nome-do-arquivo>');
    console.log('💡 Exemplo: node scripts/run-migration.js 005_create_activation_links.sql');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`📄 Executando migration: ${migrationFile}`);
  console.log('⏳ Aguarde...\n');

  try {
    await db.query(sql);
    console.log('✅ Migration executada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigration();

