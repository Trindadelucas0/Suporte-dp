/**
 * CONFIGURAÇÃO DO BANCO DE DADOS
 * PostgreSQL com pool de conexões
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'suporte_dp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Tratamento de erros do pool
pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente PostgreSQL:', err);
  process.exit(-1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};

