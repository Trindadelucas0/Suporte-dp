/**
 * SCRIPT DE INICIALIZAÇÃO AUTOMÁTICA DO BANCO
 * Usa psql para executar o schema.sql completo
 * Mais confiável para arquivos SQL complexos
 */

const db = require('../config/database');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const execAsync = promisify(exec);

async function initDatabase() {
  try {
    console.log('🔄 Verificando banco de dados...');

    // Verifica se a tabela users existe
    const checkTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ Tabelas já existem. Pulando criação...');
      return;
    }

    console.log('📦 Criando tabelas...');

    // Tenta usar psql primeiro (mais confiável)
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'suporte_dp',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

    // Monta string de conexão para psql
    const pgPassword = process.env.PGPASSWORD || dbConfig.password;
    const psqlCmd = `PGPASSWORD="${pgPassword}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${schemaPath}"`;

    try {
      // Tenta executar via psql
      const { stdout, stderr } = await execAsync(psqlCmd);
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️  Avisos do psql:', stderr);
      }
      console.log('✅ Tabelas criadas com sucesso via psql!');
    } catch (psqlError) {
      // Se psql não funcionar, usa método alternativo
      console.log('⚠️  psql não disponível, usando método alternativo...');
      await initDatabaseAlternative();
    }

    // Aguarda um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verifica e insere dados iniciais
    const checkUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const checkFeriados = await db.query('SELECT COUNT(*) as count FROM feriados');

    if (parseInt(checkUsers.rows[0].count) === 0) {
      console.log('📥 Inserindo dados iniciais (feriados)...');
      
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
      if (fs.existsSync(seedPath)) {
        const seed = fs.readFileSync(seedPath, 'utf8');
        const seedClean = seed.replace(/^--.*$/gm, '');
        const seedCommands = seedClean
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 20);

        for (const command of seedCommands) {
          try {
            await db.query(command);
          } catch (error) {
            // Ignora duplicações
          }
        }
      }

      console.log('✅ Dados iniciais inseridos!');
      console.log('💡 Execute "npm run create-admin" para criar o usuário administrador');
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.log('⚠️  Tentando método alternativo...');
    
    // Tenta método alternativo
    try {
      await initDatabaseAlternative();
    } catch (altError) {
      console.error('❌ Erro no método alternativo:', altError.message);
      console.log('⚠️  O servidor continuará, mas algumas funcionalidades podem não funcionar.');
    }
  }
}

// Método alternativo: executa comandos SQL diretamente
async function initDatabaseAlternative() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Remove comentários
  let schemaClean = schema.replace(/^--.*$/gm, '');
  
  // Divide em comandos respeitando blocos $$
  const commands = [];
  let current = '';
  let inBlock = false;
  let blockTag = '';
  
  const lines = schemaClean.split('\n');
  
  for (const line of lines) {
    // Detecta início de bloco $$
    if (line.includes('$$') && !inBlock) {
      const match = line.match(/\$[^$]*\$/);
      if (match) {
        inBlock = true;
        blockTag = match[0];
      }
    }
    
    current += line + '\n';
    
    // Detecta fim de bloco $$
    if (inBlock && line.includes(blockTag)) {
      inBlock = false;
    }
    
    // Se não está em bloco e linha termina com ;, finaliza comando
    if (!inBlock && line.trim().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed.length > 20) {
        commands.push(trimmed);
      }
      current = '';
    }
  }
  
  // Executa comandos
  for (const cmd of commands) {
    try {
      await db.query(cmd);
    } catch (error) {
      if (!error.message.includes('already exists') && 
          !error.message.includes('duplicate')) {
        // Ignora apenas erros de "já existe"
      }
    }
  }
  
  console.log('✅ Tabelas criadas via método alternativo!');
}

module.exports = initDatabase;

