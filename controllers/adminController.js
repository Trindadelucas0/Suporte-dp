/**
 * CONTROLLER: AdminController
 * Painel administrativo completo
 */

const User = require('../models/User');
const Payment = require('../models/Payment');
const db = require('../config/database');

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
      const userStats = await User.getStats();

      res.render('admin/index', {
        title: 'Painel Administrativo - Suporte DP',
        stats: {
          usuarios: userStats
        }
      });
    } catch (error) {
      console.error('Erro no painel admin:', error);
      res.render('admin/index', {
        title: 'Painel Administrativo - Suporte DP',
        stats: {
          usuarios: { total: 0, ativos: 0, inativos: 0, bloqueados: 0 }
        }
      });
    }
  }

  /**
   * Lista todos os usuários com informações de assinatura
   * NOVA LÓGICA:
   * - Ativos = usuários que pagaram (temPagamentoAtivo = true)
   * - Inativos = usuários que não renovaram (temPagamentoAtivo = false e não está bloqueado)
   * - Bloqueados = usuários bloqueados (bloqueado = true)
   */
  static async usuarios(req, res) {
    try {
      console.log('Buscando usuários com filtros:', req.query);
      
      // Busca todos os usuários primeiro (sem filtros de ativo/bloqueado)
      const filtros = {};
      // Apenas filtra por bloqueado se especificado (bloqueados são sempre bloqueados)
      if (req.query.bloqueado !== undefined) {
        filtros.bloqueado = req.query.bloqueado === 'true';
      }

      const todosUsuarios = await User.findAll(filtros);
      console.log(`Encontrados ${todosUsuarios.length} usuários`);

      // Busca pagamentos e informações adicionais para cada usuário
      const usuariosComPagamentos = await Promise.all(
        todosUsuarios.map(async (usuario) => {
          // Busca último pagamento do usuário (mais recente, pode ser renovação)
          let ultimoPagamento = null;
          let todosPagamentos = [];
          try {
            todosPagamentos = await Payment.findByUserId(usuario.id);
            if (todosPagamentos && todosPagamentos.length > 0) {
              // Ordena por data de pagamento (mais recente primeiro) e pega o primeiro
              ultimoPagamento = todosPagamentos.sort((a, b) => {
                const dateA = a.paid_at ? new Date(a.paid_at) : new Date(0);
                const dateB = b.paid_at ? new Date(b.paid_at) : new Date(0);
                return dateB - dateA;
              })[0];
            }
          } catch (error) {
            console.error(`Erro ao buscar pagamentos para usuário ${usuario.id}:`, error);
          }

          // Calcula dias restantes até expiração
          let diasRestantes = null;
          let estaExpirado = false;
          if (usuario.subscription_expires_at) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataExpiracao = new Date(usuario.subscription_expires_at);
            dataExpiracao.setHours(0, 0, 0, 0);
            const diffTime = dataExpiracao - hoje;
            diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            estaExpirado = diasRestantes < 0;
          }

          // Calcula informações adicionais de pagamento
          const pagamentosPagos = todosPagamentos.filter(p => p.status === 'paid');
          const totalPagamentos = pagamentosPagos.length;
          const totalPago = pagamentosPagos.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
          const temPagamentoAtivo = ultimoPagamento && ultimoPagamento.status === 'paid' && !estaExpirado;

          // Determina status baseado na nova lógica
          const isBloqueado = usuario.bloqueado === true || usuario.bloqueado === 'true';
          const isAtivo = !isBloqueado && (usuario.is_admin || temPagamentoAtivo);
          const isInativo = !isBloqueado && !usuario.is_admin && !temPagamentoAtivo;

          return {
            ...usuario,
            pagamento: ultimoPagamento, // Mantém compatibilidade com código existente
            ultimoPagamento: ultimoPagamento,
            todosPagamentos: todosPagamentos,
            diasRestantes: diasRestantes,
            estaExpirado: estaExpirado,
            totalPagamentos: totalPagamentos,
            totalPago: totalPago,
            temPagamentoAtivo: temPagamentoAtivo,
            // Novos campos para facilitar filtros
            isAtivo: isAtivo,
            isInativo: isInativo,
            isBloqueado: isBloqueado
          };
        })
      );

      // Aplica filtros baseados na nova lógica
      let usuariosFiltrados = usuariosComPagamentos;
      if (req.query.ativo === 'true') {
        // Ativos = usuários que pagaram (ou são admin)
        usuariosFiltrados = usuariosComPagamentos.filter(u => u.isAtivo);
      } else if (req.query.ativo === 'false') {
        // Inativos = usuários que não renovaram (não pagaram e não são bloqueados)
        usuariosFiltrados = usuariosComPagamentos.filter(u => u.isInativo);
      }
      // Se filtroBloqueado já foi aplicado no findAll, não precisa filtrar novamente
      
      res.render('admin/usuarios', {
        title: 'Gestão de Usuários - Suporte DP',
        usuarios: usuariosFiltrados || [],
        filtroAtivo: req.query.ativo,
        filtroBloqueado: req.query.bloqueado,
        csrfToken: req.csrfToken ? req.csrfToken() : null
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

      // Busca pagamentos do usuário
      let pagamentos = [];
      try {
        const paymentsResult = await db.query(
          'SELECT * FROM payments WHERE user_id = $1 ORDER BY paid_at DESC',
          [id]
        );
        pagamentos = paymentsResult.rows || [];
      } catch (error) {
        console.log('Erro ao buscar pagamentos (tabela pode não existir):', error.message);
        pagamentos = [];
      }

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
          },
          pagamentos: pagamentos || []
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

      console.log('📝 [ATUALIZAR USUÁRIO] Recebida requisição:', { id, ativo, bloqueado, is_admin });

      const data = {};
      if (ativo !== undefined) {
        data.ativo = ativo === 'true' || ativo === true;
        console.log('📝 [ATUALIZAR USUÁRIO] Campo ativo:', data.ativo);
      }
      if (bloqueado !== undefined) {
        data.bloqueado = bloqueado === 'true' || bloqueado === true;
        console.log('📝 [ATUALIZAR USUÁRIO] Campo bloqueado:', data.bloqueado);
      }
      if (is_admin !== undefined) {
        data.is_admin = is_admin === 'true' || is_admin === true;
        console.log('📝 [ATUALIZAR USUÁRIO] Campo is_admin:', data.is_admin);
      }

      if (Object.keys(data).length === 0) {
        console.warn('⚠️ [ATUALIZAR USUÁRIO] Nenhum campo para atualizar');
        return res.json({ success: false, error: 'Nenhum campo para atualizar' });
      }

      const usuario = await User.updateStatus(id, data);
      
      if (!usuario) {
        console.error('❌ [ATUALIZAR USUÁRIO] Usuário não encontrado:', id);
        return res.json({ success: false, error: 'Usuário não encontrado' });
      }

      console.log('✅ [ATUALIZAR USUÁRIO] Usuário atualizado com sucesso:', {
        id: usuario.id,
        nome: usuario.nome,
        ativo: usuario.ativo,
        bloqueado: usuario.bloqueado
      });

      res.json({ success: true, usuario });
    } catch (error) {
      console.error('❌ [ATUALIZAR USUÁRIO] Erro ao atualizar usuário:', error);
      console.error('❌ [ATUALIZAR USUÁRIO] Stack:', error.stack);
      res.status(500).json({ success: false, error: 'Erro ao atualizar usuário: ' + error.message });
    }
  }

  /**
   * Reseta senha do usuário
   */
  static async resetarSenha(req, res) {
    // Verificação dupla de permissões
    if (!req.session.user || !req.session.user.is_admin) {
      console.error('❌ [ADMIN] Tentativa de resetar senha sem permissão');
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    // Valida UUID
    const { id } = req.params;
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.error('❌ [ADMIN] ID inválido:', id);
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    try {
      const { novaSenha } = req.body;
      
      console.log('🔐 [ADMIN] Tentando resetar senha:', {
        userId: id,
        temNovaSenha: !!novaSenha,
        tamanhoSenha: novaSenha ? novaSenha.length : 0
      });

      if (!novaSenha || typeof novaSenha !== 'string') {
        console.error('❌ [ADMIN] Senha não fornecida ou inválida');
        return res.json({ success: false, error: 'Senha é obrigatória' });
      }

      if (novaSenha.length < 6) {
        console.error('❌ [ADMIN] Senha muito curta:', novaSenha.length);
        return res.json({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      // Verifica se usuário existe antes de resetar
      const usuarioExiste = await User.findById(id);
      if (!usuarioExiste) {
        console.error('❌ [ADMIN] Usuário não encontrado:', id);
        return res.json({ success: false, error: 'Usuário não encontrado' });
      }

      console.log('✅ [ADMIN] Usuário encontrado, resetando senha...');
      const usuario = await User.resetPassword(id, novaSenha);
      
      if (!usuario) {
        console.error('❌ [ADMIN] Erro: resetPassword retornou null');
        return res.json({ success: false, error: 'Erro ao resetar senha. Tente novamente.' });
      }

      console.log('✅ [ADMIN] Senha resetada com sucesso para:', usuario.email);
      res.json({ success: true, message: 'Senha resetada com sucesso!' });
    } catch (error) {
      console.error('❌ [ADMIN] Erro ao resetar senha:', error);
      console.error('Stack:', error.stack);
      res.json({ 
        success: false, 
        error: 'Erro ao resetar senha: ' + (process.env.NODE_ENV === 'development' ? error.message : 'Tente novamente mais tarde')
      });
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
      let usuarios = [];
      try {
        usuarios = await User.findAll({});
        console.log('📊 [NOTIFICAÇÕES] Total de usuários encontrados:', usuarios ? usuarios.length : 0);
        
        if (usuarios && usuarios.length > 0) {
          console.log('📋 [NOTIFICAÇÕES] Primeiros 3 usuários:', usuarios.slice(0, 3).map(u => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            is_admin: u.is_admin,
            tipo_is_admin: typeof u.is_admin
          })));
          
          const usuariosNaoAdmin = usuarios.filter(u => {
            const isAdmin = u.is_admin === true || u.is_admin === 'true' || u.is_admin === 1;
            return !isAdmin;
          });
          console.log('👥 [NOTIFICAÇÕES] Usuários não-admin:', usuariosNaoAdmin.length);
          console.log('👥 [NOTIFICAÇÕES] Detalhes dos não-admin:', usuariosNaoAdmin.map(u => ({
            nome: u.nome,
            email: u.email,
            is_admin: u.is_admin
          })));
        } else {
          console.warn('⚠️ [NOTIFICAÇÕES] Nenhum usuário retornado do banco!');
        }
      } catch (userError) {
        console.error('❌ [NOTIFICAÇÕES] Erro ao buscar usuários:', userError);
        console.error('❌ [NOTIFICAÇÕES] Stack:', userError.stack);
        usuarios = [];
      }

      // Garante que usuarios é sempre um array
      if (!Array.isArray(usuarios)) {
        console.warn('⚠️ [NOTIFICAÇÕES] usuarios não é um array, convertendo...');
        usuarios = [];
      }

      console.log('✅ [NOTIFICAÇÕES] Renderizando view com', usuarios.length, 'usuários');
      console.log('✅ [NOTIFICAÇÕES] Tipo de usuarios:', typeof usuarios, '| É array?', Array.isArray(usuarios));
      if (usuarios && usuarios.length > 0) {
        console.log('✅ [NOTIFICAÇÕES] Primeiro usuário exemplo:', {
          id: usuarios[0].id,
          nome: usuarios[0].nome,
          email: usuarios[0].email,
          is_admin: usuarios[0].is_admin,
          tipo_is_admin: typeof usuarios[0].is_admin
        });
      }

      res.render('admin/notificacoes', {
        title: 'Notificações Administrativas - Suporte DP',
        historico: historico.rows || [],
        usuarios: usuarios || [], // Garante que sempre é um array
        csrfToken: req.csrfToken ? req.csrfToken() : null
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

