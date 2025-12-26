/**
 * CONTROLLER: AdminController
 * Painel administrativo
 */

const db = require('../config/database');

class AdminController {
  static async index(req, res) {
    try {
      // Estatísticas gerais
      const [totalUsers, totalCalculos, totalChecklists] = await Promise.all([
        db.query('SELECT COUNT(*) as total FROM users'),
        db.query(`
          SELECT 
            (SELECT COUNT(*) FROM calculos_inss) +
            (SELECT COUNT(*) FROM calculos_irrf) +
            (SELECT COUNT(*) FROM calculos_fgts) as total
        `),
        db.query('SELECT COUNT(*) as total FROM checklists')
      ]);

      res.render('admin/index', {
        title: 'Painel Administrativo - Suporte DP',
        stats: {
          usuarios: parseInt(totalUsers.rows[0].total),
          calculos: parseInt(totalCalculos.rows[0].total),
          checklists: parseInt(totalChecklists.rows[0].total)
        }
      });
    } catch (error) {
      console.error('Erro no painel admin:', error);
      res.render('admin/index', {
        title: 'Painel Administrativo - Suporte DP',
        stats: { usuarios: 0, calculos: 0, checklists: 0 }
      });
    }
  }
}

module.exports = AdminController;

