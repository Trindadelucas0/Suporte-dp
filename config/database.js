/**
 * CONFIGURAÇÃO DO BANCO DE DADOS
 * PostgreSQL com pool de conexões
 */

const { Pool } = require('pg');
require('dotenv').config();

// Validação de variáveis de ambiente em produção
if (process.env.NODE_ENV === 'production') {
  // Verifica se tem DATABASE_URL OU todas as variáveis individuais
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  // Se não tem DATABASE_URL e faltam variáveis individuais
  if (!hasDatabaseUrl && missingVars.length > 0) {
    console.error('❌ ERRO CRÍTICO: Variáveis de ambiente do banco de dados não configuradas!');
    console.error(`💡 Variáveis faltando: ${missingVars.join(', ')}`);
    console.error('💡 Configure no Render: Environment → Add Environment Variable');
    console.error('');
    console.error('💡 Você tem duas opções:');
    console.error('');
    console.error('   Opção 1 - Variáveis Individuais:');
    console.error('   - DB_HOST (ex: dpg-xxxxx-a.oregon-postgres.render.com)');
    console.error('   - DB_PORT (geralmente 5432)');
    console.error('   - DB_NAME (nome do seu banco)');
    console.error('   - DB_USER (usuário do banco)');
    console.error('   - DB_PASSWORD (senha do banco)');
    console.error('');
    console.error('   Opção 2 - DATABASE_URL:');
    console.error('   - DATABASE_URL (URL completa do banco do painel PostgreSQL)');
    console.error('');
    console.error('💡 Obtenha essas informações no painel do PostgreSQL no Render:');
    console.error('   1. Acesse seu banco PostgreSQL');
    console.error('   2. Vá em "Connections"');
    console.error('   3. Copie as informações: Hostname, Database, Username, Password');
    // Não encerra o processo aqui, deixa tentar conectar e dar erro mais claro
  }
}

// Configuração do pool PostgreSQL
// Suporta tanto DATABASE_URL quanto variáveis individuais
const poolConfig = {};

if (process.env.DATABASE_URL) {
  // Se DATABASE_URL estiver definida, usa ela (formato: postgresql://user:pass@host:port/db)
  poolConfig.connectionString = process.env.DATABASE_URL;
  
  // SSL é obrigatório para conexões externas no Render
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
      rejectUnauthorized: false // Necessário para conexões do Render
    };
  }
} else {
  // Usa variáveis individuais (DB_HOST, DB_PORT, etc)
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = parseInt(process.env.DB_PORT || '5432');
  poolConfig.database = process.env.DB_NAME || 'suporte_dp';
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || '';
  
  // SSL é obrigatório para conexões externas no Render
  if (process.env.NODE_ENV === 'production' && process.env.DB_HOST && process.env.DB_HOST.includes('.render.com')) {
    poolConfig.ssl = {
      rejectUnauthorized: false // Necessário para conexões do Render
    };
  }
}

// Configurações comuns do pool
poolConfig.max = 20; // máximo de conexões no pool
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 2000;

const pool = new Pool(poolConfig);

// Tratamento de erros do pool
pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente PostgreSQL:', err);
  process.exit(-1);
});

/**
 * Executa uma função dentro de uma transação SQL
 * @param {Function} callback - Função assíncrona que recebe o client da transação
 * @returns {Promise<*>} Resultado da função callback
 */
async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  transaction
};
