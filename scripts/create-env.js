/**
 * SCRIPT PARA CRIAR ARQUIVO .env
 * Execute: node scripts/create-env.js
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Gera SESSION_SECRET aleatório
const sessionSecret = crypto.randomBytes(32).toString('hex');

const envContent = `# ============================================
# CONFIGURAÇÕES DO SERVIDOR
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# CONFIGURAÇÕES DO BANCO DE DADOS POSTGRESQL
# ============================================
# Altere estas configurações conforme seu ambiente
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=postgres

# ============================================
# CONFIGURAÇÕES DE SESSÃO
# ============================================
# SESSION_SECRET gerado automaticamente - altere em produção
SESSION_SECRET=${sessionSecret}

# ============================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ============================================
APP_NAME=Suporte DP
APP_URL=http://localhost:3000
`;

const envPath = path.join(__dirname, '..', '.env');

try {
  // Verifica se já existe
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Arquivo .env já existe!');
    console.log('💡 Se quiser recriar, delete o arquivo .env primeiro');
    process.exit(0);
  }

  // Cria o arquivo
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Arquivo .env criado com sucesso!');
  console.log('📝 Localização:', envPath);
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   1. Altere DB_PASSWORD para a senha do seu PostgreSQL');
  console.log('   2. O SESSION_SECRET foi gerado automaticamente');
  console.log('   3. Em produção, altere o SESSION_SECRET novamente');
  
} catch (error) {
  console.error('❌ Erro ao criar arquivo .env:', error.message);
  process.exit(1);
}




