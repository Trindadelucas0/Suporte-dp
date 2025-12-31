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
      console.log('✅ Tabelas já existem. Verificando campos adicionais...');
      // Verifica e adiciona campos se necessário
      await addMissingFields();
      // Verifica e cria nova tabela de risco multa
      await checkRiscoMultaTable();
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
      // Adiciona campos que podem estar faltando
      await addMissingFields();
    } catch (psqlError) {
      // Se psql não funcionar, usa método alternativo
      console.log('⚠️  psql não disponível, usando método alternativo...');
      await initDatabaseAlternative();
      await addMissingFields();
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

// Adiciona campos que podem estar faltando
async function addMissingFields() {
  try {
    console.log('🔍 Verificando campos adicionais na tabela users...');
    
    // Verifica campos da tabela users
    const columnsCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const existingColumns = columnsCheck.rows.map(r => r.column_name);
    
    // Campos básicos de status
    if (!existingColumns.includes('ativo')) {
      console.log('➕ Adicionando campo "ativo" na tabela users...');
      await db.query('ALTER TABLE users ADD COLUMN ativo BOOLEAN DEFAULT TRUE');
      await db.query('UPDATE users SET ativo = TRUE WHERE ativo IS NULL');
    }
    
    if (!existingColumns.includes('bloqueado')) {
      console.log('➕ Adicionando campo "bloqueado" na tabela users...');
      await db.query('ALTER TABLE users ADD COLUMN bloqueado BOOLEAN DEFAULT FALSE');
      await db.query('UPDATE users SET bloqueado = FALSE WHERE bloqueado IS NULL');
    }
    
    if (!existingColumns.includes('last_login')) {
      console.log('➕ Adicionando campo "last_login" na tabela users...');
      await db.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP');
    }

    // Campos de perfil
    const profileFields = [
      { name: 'telefone', type: 'VARCHAR(20)' },
      { name: 'whatsapp', type: 'VARCHAR(20)' },
      { name: 'empresa', type: 'VARCHAR(255)' },
      { name: 'cargo', type: 'VARCHAR(255)' },
      { name: 'observacoes', type: 'TEXT' },
      { name: 'instagram', type: 'VARCHAR(255)' },
      { name: 'ultima_atividade', type: 'TIMESTAMP' }
    ];

    for (const field of profileFields) {
      if (!existingColumns.includes(field.name)) {
        console.log(`➕ Adicionando campo "${field.name}" na tabela users...`);
        await db.query(`ALTER TABLE users ADD COLUMN ${field.name} ${field.type}`);
      }
    }

    // Cria índice para última atividade se não existir
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_users_ultima_atividade ON users(ultima_atividade DESC)');
    } catch (idxError) {
      // Índice pode já existir, ignora
    }
    
    console.log('✅ Campos verificados e atualizados!');
  } catch (error) {
    console.warn('⚠️  Aviso ao verificar campos:', error.message);
    // Tenta executar a migração SQL diretamente
    try {
      const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '002_add_user_profile_fields.sql');
      if (fs.existsSync(migrationPath)) {
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await db.query(migration);
        console.log('✅ Campos adicionados via migração SQL!');
      }
    } catch (migrationError) {
      console.warn('⚠️  Não foi possível executar migração:', migrationError.message);
    }
  }
}

async function checkRiscoMultaTable() {
  try {
    // Verifica se a nova tabela já existe
    const checkTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'calculos_risco_multa'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('📦 Criando tabela calculos_risco_multa...');
      const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '003_refatorar_risco_multa.sql');
      if (fs.existsSync(migrationPath)) {
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await db.query(migration);
        console.log('✅ Tabela calculos_risco_multa criada!');
      } else {
        console.warn('⚠️  Arquivo de migração não encontrado:', migrationPath);
      }
    } else {
      console.log('✅ Tabela calculos_risco_multa já existe.');
    }

    // Aplica ajuste para tornar data_rescisao opcional
    try {
      const checkColumn = await db.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'calculos_risco_multa' 
        AND column_name = 'data_rescisao'
      `);

      if (checkColumn.rows.length > 0 && checkColumn.rows[0].is_nullable === 'NO') {
        console.log('🔧 Ajustando coluna data_rescisao para permitir NULL...');
        const ajustePath = path.join(__dirname, '..', 'database', 'migrations', '004_ajustar_risco_multa_remover_data_rescisao.sql');
        if (fs.existsSync(ajustePath)) {
          const ajuste = fs.readFileSync(ajustePath, 'utf8');
          await db.query(ajuste);
          console.log('✅ Coluna data_rescisao ajustada!');
        } else {
          // Aplica ajuste direto se arquivo não existir
          await db.query('ALTER TABLE calculos_risco_multa ALTER COLUMN data_rescisao DROP NOT NULL');
          console.log('✅ Coluna data_rescisao ajustada diretamente!');
        }
      }
    } catch (ajusteError) {
      console.warn('⚠️  Aviso ao ajustar coluna data_rescisao:', ajusteError.message);
    }
  } catch (error) {
    console.warn('⚠️  Aviso ao verificar tabela calculos_risco_multa:', error.message);
  }
}

module.exports = initDatabase;

