/**
 * SCRIPT DE INICIALIZAÇÃO AUTOMÁTICA DO BANCO (Versão Melhorada)
 * Executa automaticamente quando o servidor inicia
 * Cria tabelas se não existirem
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

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

    // Lê o schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove comentários de linha única (mas mantém blocos de comentário)
    schema = schema.replace(/^--.*$/gm, '');

    // Divide em comandos SQL, respeitando blocos $$
    const commands = [];
    let currentCommand = '';
    let inDollarQuote = false;
    let dollarTag = '';

    const lines = schema.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detecta início de bloco $$
      if (line.includes('$$') && !inDollarQuote) {
        const dollarMatch = line.match(/\$[^$]*\$/);
        if (dollarMatch) {
          inDollarQuote = true;
          dollarTag = dollarMatch[0];
          currentCommand += line + '\n';
          continue;
        }
      }

      // Detecta fim de bloco $$
      if (inDollarQuote && line.includes(dollarTag)) {
        currentCommand += line + '\n';
        inDollarQuote = false;
        continue;
      }

      currentCommand += line + '\n';

      // Se não está em bloco $$ e a linha termina com ;, finaliza comando
      if (!inDollarQuote && line.trim().endsWith(';')) {
        const trimmed = currentCommand.trim();
        if (trimmed.length > 20 && !trimmed.startsWith('--')) {
          commands.push(trimmed);
        }
        currentCommand = '';
      }
    }

    // Adiciona último comando se houver
    if (currentCommand.trim().length > 20) {
      commands.push(currentCommand.trim());
    }

    // Executa cada comando
    let successCount = 0;
    let errorCount = 0;

    for (const command of commands) {
      if (command.length > 20) {
        try {
          await db.query(command);
          successCount++;
        } catch (error) {
          // Ignora erros de "já existe"
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('já existe') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            successCount++;
            continue;
          } else {
            errorCount++;
            // Mostra apenas erros críticos
            if (!error.message.includes('does not exist') && 
                !error.message.includes('não existe')) {
              console.warn('⚠️  Erro:', error.message.substring(0, 150));
            }
          }
        }
      }
    }

    console.log(`✅ Executados ${successCount} comandos com sucesso`);

    // Aguarda um pouco para garantir que tabelas foram criadas
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verifica se há dados iniciais
    let checkUsers, checkFeriados;
    try {
      checkUsers = await db.query('SELECT COUNT(*) as count FROM users');
      checkFeriados = await db.query('SELECT COUNT(*) as count FROM feriados');
    } catch (error) {
      console.warn('⚠️  Erro ao verificar dados iniciais:', error.message);
      return;
    }

    if (parseInt(checkUsers.rows[0].count) === 0) {
      console.log('📥 Inserindo dados iniciais (feriados)...');
      
      // Insere feriados
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
      if (fs.existsSync(seedPath)) {
        const seed = fs.readFileSync(seedPath, 'utf8');
        
        // Remove comentários
        let seedClean = seed.replace(/^--.*$/gm, '');
        
        // Divide por ponto e vírgula
        const seedCommands = seedClean
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 20 && !cmd.startsWith('--'));

        for (const command of seedCommands) {
          try {
            await db.query(command);
          } catch (error) {
            if (!error.message.includes('duplicate key') && 
                !error.message.includes('already exists') &&
                !error.message.includes('violates unique constraint')) {
              // Ignora erros de duplicação
            }
          }
        }
      }

      console.log('✅ Dados iniciais inseridos!');
      console.log('💡 Execute "npm run create-admin" para criar o usuário administrador');
    } else {
      console.log('✅ Banco de dados já possui dados iniciais');
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.error('Stack:', error.stack);
    // Não interrompe o servidor, apenas avisa
    console.log('⚠️  O servidor continuará, mas algumas funcionalidades podem não funcionar.');
  }
}

module.exports = initDatabase;




