require('dotenv').config();
const db = require('../config/database');

(async () => {
  try {
    // Atualizar orders que têm user_id mas não têm customer_email
    const result = await db.query(`
      UPDATE orders o
      SET customer_email = u.email
      FROM users u
      WHERE o.user_id = u.id
        AND o.customer_email IS NULL
      RETURNING o.order_nsu, o.user_id, o.customer_email
    `);
    
    console.log('✅ Orders atualizados:', result.rows.length);
    result.rows.forEach(o => {
      console.log(`  - Order: ${o.order_nsu} | User: ${o.user_id} | Email: ${o.customer_email}`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error('❌ ERRO:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();

