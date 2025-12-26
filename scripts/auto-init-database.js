/**
 * SCRIPT DE INICIALIZAÇÃO AUTOMÁTICA DO BANCO
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

    // Remove linhas de comentário que começam com --
    schema = schema.split('\n')
      .filter(line => !line.trim().startsWith('--') || line.trim().startsWith('-- ='))
      .join('\n');

    // Divide em comandos, mas preserva blocos $$ (funções)
    const commands = [];
    let currentCommand = '';
    let inDollarBlock = false;
    let dollarTag = '';

    for (let i = 0; i < schema.length; i++) {
      const char = schema[i];
      const nextChar = schema[i + 1] || '';

      // Detecta início de bloco $$
      if (char === '$' && nextChar === '$' && !inDollarBlock) {
        inDollarBlock = true;
        // Pega a tag do bloco (ex: $$, $tag$)
        let tagEnd = i + 2;
        while (schema[tagEnd] && schema[tagEnd] !== '$') {
          tagEnd++;
        }
        dollarTag = schema.substring(i, tagEnd + 1);
        currentCommand += dollarTag;
        i = tagEnd;
        continue;
      }

      // Detecta fim de bloco $$
      if (inDollarBlock && char === '$') {
        let tagStart = i;
        while (tagStart > 0 && schema[tagStart - 1] !== '$') {
          tagStart--;
        }
        const possibleTag = schema.substring(tagStart - 1, i + 1);
        if (possibleTag === dollarTag) {
          currentCommand += possibleTag;
          inDollarBlock = false;
          i++;
          continue;
        }
      }

      currentCommand += char;

      // Se não está em bloco $$ e encontrou ;, finaliza comando
      if (!inDollarBlock && char === ';') {
        const trimmed = currentCommand.trim();
        if (trimmed.length > 10 && !trimmed.startsWith('--')) {
          commands.push(trimmed);
        }
        currentCommand = '';
      }
    }

    // Adiciona último comando se houver
    if (currentCommand.trim().length > 10) {
      commands.push(currentCommand.trim());
    }

    // Executa cada comando
    for (const command of commands) {
      if (command.length > 10) {
        try {
          await db.query(command);
        } catch (error) {
          // Ignora erros de "já existe"
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('já existe')) {
            // Silencioso para objetos que já existem
            continue;
          } else {
            console.warn('⚠️  Aviso:', error.message.substring(0, 100));
          }
        }
      }
    }

    console.log('✅ Tabelas criadas com sucesso!');

    // Verifica se há dados iniciais (aguarda um pouco para garantir que tabelas foram criadas)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let checkUsers, checkFeriados;
    try {
      checkUsers = await db.query('SELECT COUNT(*) as count FROM users');
      checkFeriados = await db.query('SELECT COUNT(*) as count FROM feriados');
    } catch (error) {
      console.warn('⚠️  Erro ao verificar dados iniciais:', error.message);
      return;
    }

    if (parseInt(checkUsers.rows[0].count) === 0) {
      console.log('📥 Inserindo dados iniciais...');
      
      // Insere feriados
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
      if (fs.existsSync(seedPath)) {
        const seed = fs.readFileSync(seedPath, 'utf8');
        const seedCommands = seed
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

        for (const command of seedCommands) {
          if (command.length > 10) {
            try {
              await db.query(command);
            } catch (error) {
              if (!error.message.includes('duplicate key') && 
                  !error.message.includes('already exists')) {
                console.warn('⚠️  Aviso ao inserir dados:', error.message);
              }
            }
          }
        }
      }

      console.log('✅ Dados iniciais inseridos!');
      console.log('💡 Execute "npm run create-admin" para criar o usuário administrador');
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    // Não interrompe o servidor, apenas avisa
    console.log('⚠️  O servidor continuará, mas algumas funcionalidades podem não funcionar.');
  }
}

module.exports = initDatabase;

