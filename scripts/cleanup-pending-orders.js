/**
 * SCRIPT: Cleanup de Pedidos Pendentes
 * Limpa pedidos pendentes com mais de 24 horas
 * 
 * Executar manualmente ou configurar cron job:
 * node scripts/cleanup-pending-orders.js
 * 
 * Ou adicionar ao cron:
 * 0 2 * * * cd /caminho/do/projeto && node scripts/cleanup-pending-orders.js
 */

require('dotenv').config();
const db = require('../config/database');

async function cleanupPendingOrders() {
  try {
    console.log('🔄 Iniciando limpeza de pedidos pendentes...');

    // Busca pedidos pending com mais de 24 horas
    const result = await db.query(
      `UPDATE orders 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending' 
       AND created_at < NOW() - INTERVAL '24 hours'
       RETURNING id, order_nsu, created_at`
    );

    const cleanedCount = result.rows.length;
    
    if (cleanedCount > 0) {
      console.log(`✅ ${cleanedCount} pedido(s) pendente(s) cancelado(s) (mais de 24 horas):`);
      result.rows.forEach(order => {
        console.log(`   - ${order.order_nsu} (criado em ${new Date(order.created_at).toLocaleString('pt-BR')})`);
      });
    } else {
      console.log('✅ Nenhum pedido pendente antigo encontrado.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar pedidos pendentes:', error);
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  cleanupPendingOrders();
}

module.exports = cleanupPendingOrders;



