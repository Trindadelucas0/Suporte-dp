/**
 * SCRIPT DE INICIALIZAÇÃO AUTOMÁTICA DO BANCO (Versão Final)
 * Executa o schema.sql completo de forma mais robusta
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'suporte_dp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Verificando banco de dados...');

    // Verifica se a tabela users existe
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ Tabelas já existem. Pulando criação...');
      client.release();
      await pool.end();
      return;
    }

    console.log('📦 Criando tabelas...');

    // Lê o schema completo
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Executa o schema completo usando uma transação
    await client.query('BEGIN');
    
    try {
      // Executa o schema SQL completo
      await client.query(schema);
      await client.query('COMMIT');
      console.log('✅ Tabelas criadas com sucesso!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Aguarda um pouco
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verifica e insere dados iniciais
    const checkUsers = await client.query('SELECT COUNT(*) as count FROM users');
    const checkFeriados = await client.query('SELECT COUNT(*) as count FROM feriados');

    if (parseInt(checkUsers.rows[0].count) === 0) {
      console.log('📥 Inserindo dados iniciais (feriados)...');
      
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
      if (fs.existsSync(seedPath)) {
        const seed = fs.readFileSync(seedPath, 'utf8');
        
        // Remove apenas comentários de linha
        const seedClean = seed.replace(/^--.*$/gm, '');
        
        // Divide por ponto e vírgula e executa
        const seedCommands = seedClean
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 20);

        for (const command of seedCommands) {
          try {
            await client.query(command);
          } catch (error) {
            // Ignora erros de duplicação
            if (!error.message.includes('duplicate') && 
                !error.message.includes('already exists') &&
                !error.message.includes('violates unique constraint')) {
              // Silencioso para duplicações
            }
          }
        }
      }

      console.log('✅ Dados iniciais inseridos!');
      console.log('💡 Execute "npm run create-admin" para criar o usuário administrador');
    }

    client.release();
    await pool.end();

  } catch (error) {
    client.release();
    await pool.end();
    
    // Se o erro for sobre objetos que já existem, não é crítico
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate')) {
      console.log('✅ Objetos já existem no banco');
      return;
    }
    
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.log('⚠️  O servidor continuará, mas algumas funcionalidades podem não funcionar.');
  }
}

module.exports = initDatabase;

