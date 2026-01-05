/**
 * SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS
 * Cria todas as tabelas necessárias para o sistema
 * 
 * Execute: npm run init-db
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'suporte_dp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function initDatabase() {
  try {
    console.log('🔄 Iniciando criação do banco de dados...\n');

    // Lê o arquivo SQL de schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Executa o schema
    await pool.query(schema);
    console.log('✅ Tabelas criadas com sucesso!');

    // Insere dados iniciais
    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seed);
      console.log('✅ Dados iniciais inseridos!');
    }

    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

initDatabase();




