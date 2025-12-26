/**
 * CONTROLLER: DashboardController
 * Painel principal do usuário
 */

const db = require('../config/database');

class DashboardController {
  static async index(req, res) {
    const userId = req.session.user.id;

    try {
      // Estatísticas rápidas
      const [calculosInss, calculosIrrf, calculosFgts, checklists] = await Promise.all([
        db.query('SELECT COUNT(*) as total FROM calculos_inss WHERE user_id = $1', [userId]),
        db.query('SELECT COUNT(*) as total FROM calculos_irrf WHERE user_id = $1', [userId]),
        db.query('SELECT COUNT(*) as total FROM calculos_fgts WHERE user_id = $1', [userId]),
        db.query('SELECT COUNT(*) as total FROM checklists WHERE user_id = $1', [userId])
      ]);

      // Últimos cálculos
      const ultimosCalculos = await db.query(`
        SELECT 'INSS' as tipo, created_at, valor_inss as valor 
        FROM calculos_inss 
        WHERE user_id = $1
        UNION ALL
        SELECT 'IRRF' as tipo, created_at, valor_irrf as valor 
        FROM calculos_irrf 
        WHERE user_id = $1
        UNION ALL
        SELECT 'FGTS' as tipo, created_at, valor_fgts as valor 
        FROM calculos_fgts 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId]);

      res.render('dashboard/index', {
        title: 'Dashboard - Suporte DP',
        stats: {
          calculosInss: parseInt(calculosInss.rows[0].total),
          calculosIrrf: parseInt(calculosIrrf.rows[0].total),
          calculosFgts: parseInt(calculosFgts.rows[0].total),
          checklists: parseInt(checklists.rows[0].total)
        },
        ultimosCalculos: ultimosCalculos.rows
      });
    } catch (error) {
      console.error('Erro no dashboard:', error);
      res.render('dashboard/index', {
        title: 'Dashboard - Suporte DP',
        stats: { calculosInss: 0, calculosIrrf: 0, calculosFgts: 0, checklists: 0 },
        ultimosCalculos: []
      });
    }
  }
}

module.exports = DashboardController;

