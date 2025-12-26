/**
 * Script para criar usuário admin
 * Execute após instalar dependências: node scripts/create-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createAdmin() {
  try {
    const senha = 'admin123';
    const senhaHash = await bcrypt.hash(senha, 10);
    
    const result = await db.query(
      `INSERT INTO users (nome, email, senha_hash, is_admin) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (email) 
       DO UPDATE SET senha_hash = $3 
       RETURNING id, nome, email`,
      ['Administrador', 'admin@suportedp.com', senhaHash, true]
    );

    console.log('✅ Usuário admin criado/atualizado com sucesso!');
    console.log('Email: admin@suportedp.com');
    console.log('Senha: admin123');
    console.log('⚠️  ALTERE A SENHA EM PRODUÇÃO!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    process.exit(1);
  }
}

createAdmin();

