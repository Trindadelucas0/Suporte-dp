/**
 * SCRIPT: Verificação de Inadimplência
 * Verifica usuários com assinatura vencida e bloqueia automaticamente
 * 
 * Executar: node scripts/check-subscriptions.js
 * Ou configurar como cron job para rodar diariamente
 */

require('dotenv').config();
const db = require('../config/database');
const User = require('../models/User');

async function verificarInadimplencia() {
  try {
    console.log('🔍 Iniciando verificação de inadimplência...');

    // Busca usuários com subscription_expires_at < hoje
    const hoje = new Date().toISOString().split('T')[0]; // Formato DATE
    
    const result = await db.query(
      `SELECT id, nome, email, subscription_expires_at, subscription_status, status
       FROM users
       WHERE subscription_expires_at IS NOT NULL
       AND subscription_expires_at < $1
       AND subscription_status = 'ativa'
       AND status = 'ativo'`,
      [hoje]
    );

    const usuariosVencidos = result.rows;
    console.log(`📊 Encontrados ${usuariosVencidos.length} usuários com assinatura vencida`);

    if (usuariosVencidos.length === 0) {
      console.log('✅ Nenhum usuário com assinatura vencida encontrado');
      return;
    }

    // Atualiza cada usuário
    for (const usuario of usuariosVencidos) {
      try {
        await User.updateSubscription(usuario.id, {
          status: 'bloqueado',
          subscription_status: 'inadimplente'
        });

        console.log(`🔒 Usuário bloqueado: ${usuario.email} (ID: ${usuario.id})`);
      } catch (error) {
        console.error(`❌ Erro ao bloquear usuário ${usuario.email}:`, error.message);
      }
    }

    console.log(`✅ Verificação concluída. ${usuariosVencidos.length} usuário(s) bloqueado(s)`);
  } catch (error) {
    console.error('❌ Erro na verificação de inadimplência:', error);
    throw error;
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  verificarInadimplencia()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = verificarInadimplencia;

