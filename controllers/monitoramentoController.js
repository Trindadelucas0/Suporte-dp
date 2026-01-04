/**
 * CONTROLLER: MonitoramentoController
 * Painel de monitoramento de cobranças e clientes
 */

const Cobranca = require('../models/Cobranca');
const User = require('../models/User');
const db = require('../config/database');

class MonitoramentoController {
  /**
   * Página principal de monitoramento
   */
  static async index(req, res) {
    try {
      // Busca estatísticas gerais
      const stats = await MonitoramentoController.getEstatisticas();
      
      // Busca clientes em destaque
      const clientesPendentes = await MonitoramentoController.getClientesPendentes();
      const clientesBloqueados = await MonitoramentoController.getClientesBloqueados();
      const clientesPrestesBloquear = await MonitoramentoController.getClientesPrestesBloquear();
      const clientesEmDia = await MonitoramentoController.getClientesEmDia();

      res.render('admin/monitoramento', {
        title: 'Monitoramento de Cobranças - Suporte DP',
        user: req.session.user,
        stats: stats,
        clientesPendentes: clientesPendentes,
        clientesBloqueados: clientesBloqueados,
        clientesPrestesBloquear: clientesPrestesBloquear,
        clientesEmDia: clientesEmDia
      });
    } catch (error) {
      console.error('❌ Erro ao carregar monitoramento:', error);
      console.error('Stack:', error.stack);
      
      // Tenta renderizar página de erro, se falhar, retorna erro 500
      try {
        res.status(500).render('error', {
          title: 'Erro - Suporte DP',
          message: 'Erro ao carregar dados de monitoramento',
          error: process.env.NODE_ENV === 'development' ? error.message : null
        });
      } catch (renderError) {
        res.status(500).json({
          success: false,
          error: 'Erro ao carregar dados de monitoramento',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor'
        });
      }
    }
  }

  /**
   * API: Estatísticas gerais
   */
  static async estatisticas(req, res) {
    try {
      const stats = await MonitoramentoController.getEstatisticas();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * API: Lista clientes por status
   */
  static async clientes(req, res) {
    try {
      const { status } = req.query; // pendente, paga, vencida, bloqueado, prestes_bloquear, em_dia

      let clientes = [];
      
      switch (status) {
        case 'pendente':
          clientes = await MonitoramentoController.getClientesPendentes();
          break;
        case 'paga':
          clientes = await MonitoramentoController.getClientesEmDia();
          break;
        case 'vencida':
          clientes = await MonitoramentoController.getClientesVencidos();
          break;
        case 'bloqueado':
          clientes = await MonitoramentoController.getClientesBloqueados();
          break;
        case 'prestes_bloquear':
          clientes = await MonitoramentoController.getClientesPrestesBloquear();
          break;
        case 'em_dia':
          clientes = await MonitoramentoController.getClientesEmDia();
          break;
        default:
          clientes = await MonitoramentoController.getTodosClientes();
      }

      res.json({ success: true, data: clientes });
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Busca estatísticas gerais
   */
  static async getEstatisticas() {
    try {
      // Total de clientes
      const totalClientes = await db.query('SELECT COUNT(*) as total FROM users WHERE is_admin = false');
      
      // Clientes em dia (com cobrança paga no último mês)
      const clientesEmDia = await db.query(`
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND c.status = 'paga'
        AND c.data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
      `);

      // Clientes pendentes
      const clientesPendentes = await db.query(`
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND c.status IN ('pendente', 'vencida')
        AND c.data_vencimento >= CURRENT_DATE - INTERVAL '30 days'
      `);

      // Clientes bloqueados
      const clientesBloqueados = await db.query(`
        SELECT COUNT(*) as total
        FROM users
        WHERE is_admin = false
        AND bloqueado_pagamento = true
      `);

      // Clientes prestes a bloquear (vencido há menos de 7 dias)
      const diasParaBloqueio = parseInt(process.env.DIAS_PARA_BLOQUEIO || 7);
      const diasValido = isNaN(diasParaBloqueio) || diasParaBloqueio <= 0 ? 7 : diasParaBloqueio;
      // PostgreSQL não permite parâmetros em INTERVAL, então usamos interpolação segura
      const clientesPrestesBloquear = await db.query(`
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND u.bloqueado_pagamento = false
        AND c.status = 'vencida'
        AND c.data_vencimento >= CURRENT_DATE - INTERVAL '` + diasValido + ` days'
        AND c.data_vencimento < CURRENT_DATE
      `);

      // Total de cobranças pendentes
      const cobrancasPendentes = await db.query(`
        SELECT COUNT(*) as total, COALESCE(SUM(valor), 0) as valor_total
        FROM cobrancas
        WHERE status IN ('pendente', 'vencida')
      `);

      // Total de cobranças pagas (últimos 30 dias)
      const cobrancasPagas = await db.query(`
        SELECT COUNT(*) as total, COALESCE(SUM(valor), 0) as valor_total
        FROM cobrancas
        WHERE status = 'paga'
        AND data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
      `);

      return {
        totalClientes: parseInt(totalClientes.rows[0]?.total || 0),
        clientesEmDia: parseInt(clientesEmDia.rows[0]?.total || 0),
        clientesPendentes: parseInt(clientesPendentes.rows[0]?.total || 0),
        clientesBloqueados: parseInt(clientesBloqueados.rows[0]?.total || 0),
        clientesPrestesBloquear: parseInt(clientesPrestesBloquear.rows[0]?.total || 0),
        cobrancasPendentes: {
          quantidade: parseInt(cobrancasPendentes.rows[0]?.total || 0),
          valorTotal: parseFloat(cobrancasPendentes.rows[0]?.valor_total || 0)
        },
        cobrancasPagas: {
          quantidade: parseInt(cobrancasPagas.rows[0]?.total || 0),
          valorTotal: parseFloat(cobrancasPagas.rows[0]?.valor_total || 0)
        }
      };
    } catch (error) {
      console.error('❌ Erro em getEstatisticas:', error);
      // Retorna valores padrão em caso de erro
      return {
        totalClientes: 0,
        clientesEmDia: 0,
        clientesPendentes: 0,
        clientesBloqueados: 0,
        clientesPrestesBloquear: 0,
        cobrancasPendentes: { quantidade: 0, valorTotal: 0 },
        cobrancasPagas: { quantidade: 0, valorTotal: 0 }
      };
    }
  }

  /**
   * Busca clientes com cobranças pendentes
   */
  static async getClientesPendentes() {
    try {
      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          c.id as cobranca_id,
          c.valor,
          TO_CHAR(c.data_vencimento, 'DD/MM/YYYY') as data_vencimento_formatada,
          c.data_vencimento as data_vencimento_raw,
          c.data_vencimento,
          c.status,
          c.mes_referencia,
          CURRENT_DATE - c.data_vencimento as dias_atraso
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND c.status IN ('pendente', 'vencida')
        AND c.data_vencimento >= CURRENT_DATE - INTERVAL '60 days'
        ORDER BY c.data_vencimento ASC
        LIMIT 50
      `);

      // Formata datas para garantir compatibilidade
      return result.rows.map(row => ({
        ...row,
        data_vencimento: row.data_vencimento || (row.data_vencimento_raw ? new Date(row.data_vencimento_raw).toISOString().split('T')[0] : null)
      }));
    } catch (error) {
      console.error('❌ Erro em getClientesPendentes:', error);
      return [];
    }
  }

  /**
   * Busca clientes bloqueados
   */
  static async getClientesBloqueados() {
    try {
      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          c.id as cobranca_id,
          c.valor,
          TO_CHAR(c.data_vencimento, 'DD/MM/YYYY') as data_vencimento_formatada,
          c.data_vencimento as data_vencimento_raw,
          c.data_vencimento,
          c.status,
          c.mes_referencia,
          CURRENT_DATE - c.data_vencimento as dias_atraso
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND u.bloqueado_pagamento = true
        AND c.status IN ('pendente', 'vencida')
        ORDER BY c.data_vencimento ASC
        LIMIT 50
      `);

      // Formata datas para garantir compatibilidade
      return result.rows.map(row => ({
        ...row,
        data_vencimento: row.data_vencimento || (row.data_vencimento_raw ? new Date(row.data_vencimento_raw).toISOString().split('T')[0] : null)
      }));
    } catch (error) {
      console.error('❌ Erro em getClientesBloqueados:', error);
      return [];
    }
  }

  /**
   * Busca clientes prestes a bloquear
   */
  static async getClientesPrestesBloquear() {
    try {
      const diasParaBloqueio = parseInt(process.env.DIAS_PARA_BLOQUEIO || 7);
      // Garante que é um número válido
      const diasValido = isNaN(diasParaBloqueio) || diasParaBloqueio <= 0 ? 7 : diasParaBloqueio;
      
      // PostgreSQL não permite parâmetros em INTERVAL, então usamos interpolação segura
      // O valor já foi validado como número inteiro acima
      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          c.id as cobranca_id,
          c.valor,
          TO_CHAR(c.data_vencimento, 'DD/MM/YYYY') as data_vencimento_formatada,
          c.data_vencimento as data_vencimento_raw,
          c.data_vencimento,
          c.status,
          c.mes_referencia,
          CURRENT_DATE - c.data_vencimento as dias_atraso,
          ` + diasValido + ` - (CURRENT_DATE - c.data_vencimento) as dias_para_bloquear
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND u.bloqueado_pagamento = false
        AND c.status = 'vencida'
        AND c.data_vencimento >= CURRENT_DATE - INTERVAL '` + diasValido + ` days'
        AND c.data_vencimento < CURRENT_DATE
        ORDER BY c.data_vencimento ASC
        LIMIT 50
      `);

      // Formata datas para garantir compatibilidade
      return result.rows.map(row => ({
        ...row,
        data_vencimento: row.data_vencimento || (row.data_vencimento_raw ? new Date(row.data_vencimento_raw).toISOString().split('T')[0] : null)
      }));
    } catch (error) {
      console.error('❌ Erro em getClientesPrestesBloquear:', error);
      return [];
    }
  }

  /**
   * Busca clientes em dia
   */
  static async getClientesEmDia() {
    try {
      const result = await db.query(`
        SELECT DISTINCT
          u.id,
          u.nome,
          u.email,
          TO_CHAR((SELECT MAX(data_pagamento) FROM cobrancas WHERE user_id = u.id AND status = 'paga'), 'DD/MM/YYYY') as ultimo_pagamento,
          (SELECT MAX(data_pagamento) FROM cobrancas WHERE user_id = u.id AND status = 'paga') as ultimo_pagamento_raw,
          (SELECT mes_referencia FROM cobrancas WHERE user_id = u.id AND status = 'paga' ORDER BY data_pagamento DESC LIMIT 1) as ultimo_mes_pago
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND c.status = 'paga'
        AND c.data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY u.nome ASC
        LIMIT 50
      `);

      // Formata datas para garantir compatibilidade
      return result.rows.map(row => ({
        ...row,
        ultimo_pagamento: row.ultimo_pagamento || (row.ultimo_pagamento_raw ? new Date(row.ultimo_pagamento_raw).toISOString().split('T')[0] : null)
      }));
    } catch (error) {
      console.error('❌ Erro em getClientesEmDia:', error);
      return [];
    }
  }

  /**
   * Busca clientes vencidos
   */
  static async getClientesVencidos() {
    try {
      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          c.id as cobranca_id,
          c.valor,
          c.data_vencimento,
          c.status,
          c.mes_referencia,
          CURRENT_DATE - c.data_vencimento as dias_atraso
        FROM users u
        INNER JOIN cobrancas c ON c.user_id = u.id
        WHERE u.is_admin = false
        AND c.status = 'vencida'
        ORDER BY c.data_vencimento ASC
        LIMIT 50
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Erro em getClientesVencidos:', error);
      return [];
    }
  }

  /**
   * Busca todos os clientes com status
   */
  static async getTodosClientes() {
    try {
      const result = await db.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          u.bloqueado_pagamento,
          (SELECT status FROM cobrancas WHERE user_id = u.id ORDER BY data_vencimento DESC LIMIT 1) as status_ultima_cobranca,
          (SELECT data_vencimento FROM cobrancas WHERE user_id = u.id ORDER BY data_vencimento DESC LIMIT 1) as data_ultimo_vencimento,
          (SELECT data_pagamento FROM cobrancas WHERE user_id = u.id AND status = 'paga' ORDER BY data_pagamento DESC LIMIT 1) as data_ultimo_pagamento
        FROM users u
        WHERE u.is_admin = false
        ORDER BY u.nome ASC
        LIMIT 100
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Erro em getTodosClientes:', error);
      return [];
    }
  }
}

module.exports = MonitoramentoController;

