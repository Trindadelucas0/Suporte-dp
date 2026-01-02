/**
 * CONTROLLER: AdminController
 * Painel administrativo completo
 */

const db = require('../config/database');
const User = require('../models/User');
const UserActivityService = require('../services/userActivityService');

class AdminController {
  /**
   * Dashboard principal do admin
   */
  static async index(req, res) {
    // Verificação dupla de permissões
    if (!req.session.user || !req.session.user.is_admin) {
      return res.status(403).render('error', {
        title: 'Acesso Negado',
        error: 'Você não tem permissão para acessar esta página.'
      });
    }

    try {
      const [userStats, calculosStats, onlineUsers, offlineUsers] = await Promise.all([
        User.getStats(),
        db.query(`
          SELECT 
            (SELECT COUNT(*) FROM calculos_inss) +
            (SELECT COUNT(*) FROM calculos_irrf) +
            (SELECT COUNT(*) FROM calculos_fgts) +
            (SELECT COUNT(*) FROM calculos_avos) +
            (SELECT COUNT(*) FROM calculos_periculosidade) +
            (SELECT COUNT(*) FROM calculos_custo) +
            (SELECT COUNT(*) FROM calculos_data_base) +
            (SELECT COUNT(*) FROM calculos_contrato_experiencia) as total
        `),
        UserActivityService.getOnlineUsers().catch(() => []),
        UserActivityService.getOfflineUsers().catch(() => [])
      ]);

      res.render('admin/index', {
        title: 'Painel Administrativo - Suporte DP',
        stats: {
          usuarios: userStats,
          calculos: parseInt(calculosStats.rows[0]?.total || 0)
        },
        onlineUsers: onlineUsers || [],
        offlineUsers: offlineUsers || []
      });
    } catch (error) {
      console.error('Erro no painel admin:', error);
      res.render('admin/index', {
        title: 'Painel Administrativo - Suporte DP',
        stats: {
          usuarios: { total: 0, ativos: 0, inativos: 0, bloqueados: 0 },
          calculos: 0
        },
        onlineUsers: [],
        offlineUsers: []
      });
    }
  }

  /**
   * Lista todos os usuários
   */
  static async usuarios(req, res) {
    try {
      console.log('Buscando usuários com filtros:', req.query);
      
      const filtros = {};
      if (req.query.ativo !== undefined) filtros.ativo = req.query.ativo === 'true';
      if (req.query.bloqueado !== undefined) filtros.bloqueado = req.query.bloqueado === 'true';

      const usuarios = await User.findAll(filtros);
      console.log(`Encontrados ${usuarios.length} usuários`);
      
      res.render('admin/usuarios', {
        title: 'Gestão de Usuários - Suporte DP',
        usuarios: usuarios || [],
        filtroAtivo: req.query.ativo,
        filtroBloqueado: req.query.bloqueado
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      console.error('Stack:', error.stack);
      res.render('admin/usuarios', {
        title: 'Gestão de Usuários - Suporte DP',
        usuarios: [],
        filtroAtivo: null,
        filtroBloqueado: null,
        error: 'Erro ao carregar usuários: ' + error.message
      });
    }
  }

  /**
   * Detalhes de um usuário (com todos os dados)
   */
  static async usuarioDetalhes(req, res) {
    try {
      const { id } = req.params;
      // Busca perfil completo incluindo campos adicionais
      const usuario = await User.findProfileById(id);
      
      if (!usuario) {
        return res.status(404).render('error', {
          title: 'Usuário não encontrado',
          error: 'Usuário não encontrado'
        });
      }

      // Busca TODOS os dados do usuário
      const [
        calculosInss,
        calculosIrrf,
        calculosFgts,
        calculosAvos,
        calculosPericulosidade,
        calculosCusto,
        calculosDataBase,
        calculosContratoExperiencia,
        checklists,
        anotacoesCalendario,
        obrigacoesCalendario
      ] = await Promise.all([
        db.query('SELECT * FROM calculos_inss WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_irrf WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_fgts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_avos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_periculosidade WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_custo WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_data_base WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM calculos_contrato_experiencia WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT * FROM checklists WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]).catch(() => ({ rows: [] })),
        db.query('SELECT COUNT(*) as total FROM calendario_anotacoes WHERE user_id = $1', [id]).catch(() => ({ rows: [{ total: 0 }] })),
        db.query('SELECT COUNT(*) as total FROM calendario_obrigacoes WHERE user_id = $1', [id]).catch(() => ({ rows: [{ total: 0 }] }))
      ]);

      // Busca sugestões/bugs apenas se a tabela existir
      let sugestoesBugs = { rows: [] };
      try {
        sugestoesBugs = await db.query('SELECT * FROM sugestoes_bugs WHERE user_id = $1 ORDER BY created_at DESC', [id]);
      } catch (error) {
        // Tabela não existe, ignora
        console.log('Tabela sugestoes_bugs não encontrada, ignorando...');
      }

      // Conta total de cálculos
      const totalCalculos = 
        calculosInss.rows.length +
        calculosIrrf.rows.length +
        calculosFgts.rows.length +
        calculosAvos.rows.length +
        calculosPericulosidade.rows.length +
        calculosCusto.rows.length +
        calculosDataBase.rows.length +
        calculosContratoExperiencia.rows.length;

      res.render('admin/usuario-detalhes', {
        title: `Usuário: ${usuario.nome} - Suporte DP`,
        usuario,
        dados: {
          calculos: {
            inss: calculosInss.rows,
            irrf: calculosIrrf.rows,
            fgts: calculosFgts.rows,
            avos: calculosAvos.rows,
            periculosidade: calculosPericulosidade.rows,
            custo: calculosCusto.rows,
            dataBase: calculosDataBase.rows,
            contratoExperiencia: calculosContratoExperiencia.rows,
            total: totalCalculos
          },
          checklists: checklists.rows,
          sugestoesBugs: sugestoesBugs.rows,
          calendario: {
            anotacoes: parseInt(anotacoesCalendario.rows[0].total),
            obrigacoes: parseInt(obrigacoesCalendario.rows[0].total)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do usuário:', error);
      res.status(500).render('error', {
        title: 'Erro',
        error: 'Erro ao buscar detalhes do usuário'
      });
    }
  }

  /**
   * Atualiza status do usuário (ativo/bloqueado/admin)
   */
  static async atualizarUsuario(req, res) {
    try {
      const { id } = req.params;
      const { ativo, bloqueado, is_admin } = req.body;

      const data = {};
      if (ativo !== undefined) data.ativo = ativo === 'true' || ativo === true;
      if (bloqueado !== undefined) data.bloqueado = bloqueado === 'true' || bloqueado === true;
      if (is_admin !== undefined) data.is_admin = is_admin === 'true' || is_admin === true;

      const usuario = await User.updateStatus(id, data);
      
      if (!usuario) {
        return res.json({ success: false, error: 'Usuário não encontrado' });
      }

      res.json({ success: true, usuario });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.json({ success: false, error: 'Erro ao atualizar usuário' });
    }
  }

  /**
   * Reseta senha do usuário
   */
  static async resetarSenha(req, res) {
    // Verificação dupla de permissões
    if (!req.session.user || !req.session.user.is_admin) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    // Valida UUID
    const { id } = req.params;
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    try {
      const { id } = req.params;
      const { novaSenha } = req.body;

      if (!novaSenha || novaSenha.length < 6) {
        return res.json({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      const usuario = await User.resetPassword(id, novaSenha);
      
      if (!usuario) {
        return res.json({ success: false, error: 'Usuário não encontrado' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      res.json({ success: false, error: 'Erro ao resetar senha' });
    }
  }

  /**
   * Página de notificações administrativas
   */
  static async notificacoes(req, res) {
    if (!req.session.user || !req.session.user.is_admin) {
      return res.status(403).render('error', {
        title: 'Acesso Negado',
        error: 'Você não tem permissão para acessar esta página.'
      });
    }

    try {
      // Busca histórico de notificações enviadas pelo admin
      const historico = await db.query(
        `SELECT n.*, u.nome as usuario_nome 
         FROM notificacoes n
         LEFT JOIN users u ON n.user_id = u.id
         WHERE n.tarefa_id IS NULL
         ORDER BY n.created_at DESC
         LIMIT 100`
      );

      // Busca lista de usuários para seleção
      const usuarios = await User.findAll({});

      res.render('admin/notificacoes', {
        title: 'Notificações Administrativas - Suporte DP',
        historico: historico.rows || [],
        usuarios: usuarios || []
      });
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      res.render('admin/notificacoes', {
        title: 'Notificações Administrativas - Suporte DP',
        historico: [],
        usuarios: [],
        error: 'Erro ao carregar notificações'
      });
    }
  }

  /**
   * Cria notificação administrativa
   */
  static async criarNotificacao(req, res) {
    if (!req.session.user || !req.session.user.is_admin) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    try {
      const { titulo, mensagem, tipo, destinatario } = req.body;

      // Validações
      if (!titulo || titulo.trim().length === 0) {
        return res.json({ success: false, error: 'Título é obrigatório' });
      }

      if (!mensagem || mensagem.trim().length === 0) {
        return res.json({ success: false, error: 'Mensagem é obrigatória' });
      }

      if (!tipo || !['info', 'warning', 'success', 'error'].includes(tipo)) {
        return res.json({ success: false, error: 'Tipo inválido' });
      }

      let usuariosParaNotificar = [];

      if (destinatario === 'todos') {
        // Busca todos os usuários exceto admin
        const usuarios = await User.findAll({});
        usuariosParaNotificar = usuarios.filter(u => !u.is_admin);
      } else if (destinatario) {
        // Usuário específico
        const usuario = await User.findById(destinatario);
        if (usuario) {
          usuariosParaNotificar = [usuario];
        }
      } else {
        return res.json({ success: false, error: 'Destinatário não especificado' });
      }

      // Cria notificação para cada usuário
      const notificacoesCriadas = [];
      for (const usuario of usuariosParaNotificar) {
        try {
          const result = await db.query(
            `INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, lida, tarefa_id, link)
             VALUES ($1, $2, $3, $4, false, NULL, NULL)
             RETURNING *`,
            [usuario.id, tipo, titulo.trim(), mensagem.trim()]
          );
          notificacoesCriadas.push(result.rows[0]);
        } catch (error) {
          console.error(`Erro ao criar notificação para usuário ${usuario.id}:`, error);
          // Continua para os próximos usuários mesmo se um falhar
        }
      }

      res.json({ 
        success: true, 
        message: `${notificacoesCriadas.length} notificação(ões) criada(s) com sucesso`,
        count: notificacoesCriadas.length
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      res.json({ success: false, error: 'Erro ao criar notificação' });
    }
  }

}

module.exports = AdminController;

