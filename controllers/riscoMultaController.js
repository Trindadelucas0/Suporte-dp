/**
 * CONTROLLER: RiscoMultaController
 * Gerencia análises de período de risco e multa
 */

const RiscoMultaService = require('../services/riscoMultaService');
const db = require('../config/database');

class RiscoMultaController {
  static async index(req, res) {
    const userId = req.session.user.id;
    
    // Busca todas as consultas do usuário
    let consultas = [];
    try {
      const consultasResult = await db.query(
        `SELECT 
          id,
          nome_sindicato,
          cnpj_sindicato,
          data_base,
          dados_adicionais,
          created_at
         FROM calculos_risco_multa 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
        consultas = consultasResult.rows.map(row => {
          try {
            const dados = row.dados_adicionais ? (typeof row.dados_adicionais === 'string' ? JSON.parse(row.dados_adicionais) : row.dados_adicionais) : {};
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: dados.dataInicioRisco || null,
              data_fim_risco: dados.dataFimRisco || null,
              created_at: row.created_at
            };
          } catch (parseError) {
            console.warn('Erro ao parsear dados_adicionais:', parseError);
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: null,
              data_fim_risco: null,
              created_at: row.created_at
            };
          }
        });
    } catch (err) {
      console.error('Erro ao buscar consultas:', err);
    }

    res.render('risco-multa/index', {
      title: 'Período de Risco Multa - Suporte DP',
      resultado: null,
      error: null,
      consultas
    });
  }

  static async calcular(req, res) {
    const userId = req.session.user.id;
    const {
      nomeSindicato,
      cnpjSindicato,
      dataBase
    } = req.body;

    try {
      // Busca consultas existentes para passar na view mesmo em caso de erro
      let consultasExistentes = [];
      try {
        const consultasResult = await db.query(
          `SELECT 
            id,
            nome_sindicato,
            cnpj_sindicato,
            data_base,
            dados_adicionais,
            created_at
           FROM calculos_risco_multa 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );
        consultasExistentes = consultasResult.rows.map(row => {
          try {
            const dados = row.dados_adicionais ? (typeof row.dados_adicionais === 'string' ? JSON.parse(row.dados_adicionais) : row.dados_adicionais) : {};
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: dados.dataInicioRisco || null,
              data_fim_risco: dados.dataFimRisco || null,
              created_at: row.created_at
            };
          } catch (parseError) {
            console.warn('Erro ao parsear dados_adicionais:', parseError);
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: null,
              data_fim_risco: null,
              created_at: row.created_at
            };
          }
        });
      } catch (err) {
        console.warn('Erro ao buscar consultas:', err.message);
      }

      // Validações
      if (!nomeSindicato || !cnpjSindicato) {
        return res.render('risco-multa/index', {
          title: 'Período de Risco Multa - Suporte DP',
          resultado: null,
          error: 'Preencha o nome e CNPJ do sindicato',
          consultas: consultasExistentes
        });
      }

      if (!dataBase) {
        return res.render('risco-multa/index', {
          title: 'Período de Risco Multa - Suporte DP',
          resultado: null,
          error: 'Preencha a data base',
          consultas: consultasExistentes
        });
      }

      // Realiza o cálculo do período de risco
      const resultado = RiscoMultaService.calcular(dataBase);

      // Salva no histórico
      try {
        await db.query(
          `INSERT INTO calculos_risco_multa (
            user_id, 
            nome_sindicato, 
            cnpj_sindicato,
            data_base,
            data_rescisao,
            esta_no_periodo_risco,
            gera_multa,
            dados_adicionais
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            nomeSindicato.trim(),
            cnpjSindicato.trim(),
            dataBase,
            null, // data_rescisao não é mais usada, mas mantém compatibilidade
            true, // Sempre está no período de risco quando calculado
            true, // Sempre pode gerar multa se rescisão ocorrer no período
            JSON.stringify({
              dataInicioRisco: resultado.dataInicioRisco,
              dataFimRisco: resultado.dataFimRisco
            })
          ]
        );
      } catch (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        // Continua mesmo se não conseguir salvar
      }

      // Busca todas as consultas atualizadas do usuário
      let consultas = [];
      try {
        const histResult = await db.query(
          `SELECT 
            id,
            nome_sindicato,
            cnpj_sindicato,
            data_base,
            dados_adicionais,
            created_at
           FROM calculos_risco_multa 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );
        consultas = histResult.rows.map(row => {
          try {
            const dados = row.dados_adicionais ? (typeof row.dados_adicionais === 'string' ? JSON.parse(row.dados_adicionais) : row.dados_adicionais) : {};
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: dados.dataInicioRisco || null,
              data_fim_risco: dados.dataFimRisco || null,
              created_at: row.created_at
            };
          } catch (parseError) {
            console.warn('Erro ao parsear dados_adicionais:', parseError);
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: null,
              data_fim_risco: null,
              created_at: row.created_at
            };
          }
        });
      } catch (err) {
        console.error('Erro ao buscar consultas:', err);
      }

      res.render('risco-multa/index', {
        title: 'Período de Risco Multa - Suporte DP',
        resultado: {
          ...resultado,
          nomeSindicato,
          cnpjSindicato
        },
        error: null,
        consultas
      });
    } catch (error) {
      console.error('Erro ao calcular período de risco:', error);
      
      // Busca consultas mesmo em caso de erro
      let consultasErro = [];
      try {
        const consultasResult = await db.query(
          `SELECT 
            id,
            nome_sindicato,
            cnpj_sindicato,
            data_base,
            dados_adicionais,
            created_at
           FROM calculos_risco_multa 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [userId]
        );
        consultasErro = consultasResult.rows.map(row => {
          try {
            const dados = row.dados_adicionais ? (typeof row.dados_adicionais === 'string' ? JSON.parse(row.dados_adicionais) : row.dados_adicionais) : {};
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: dados.dataInicioRisco || null,
              data_fim_risco: dados.dataFimRisco || null,
              created_at: row.created_at
            };
          } catch (parseError) {
            console.warn('Erro ao parsear dados_adicionais:', parseError);
            return {
              id: row.id,
              nome_sindicato: row.nome_sindicato,
              cnpj_sindicato: row.cnpj_sindicato,
              data_base: row.data_base,
              data_inicio_risco: null,
              data_fim_risco: null,
              created_at: row.created_at
            };
          }
        });
      } catch (err) {
        console.warn('Erro ao buscar consultas:', err.message);
      }

      res.render('risco-multa/index', {
        title: 'Período de Risco Multa - Suporte DP',
        resultado: null,
        error: 'Erro ao calcular. Verifique os dados e tente novamente.',
        consultas: consultasErro
      });
    }
  }

  static async deletar(req, res) {
    const userId = req.session.user.id;
    const { id } = req.params;

    try {
      // Verifica se a consulta pertence ao usuário
      const consultaCheck = await db.query(
        'SELECT id FROM calculos_risco_multa WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (consultaCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Consulta não encontrada ou você não tem permissão para excluí-la.' 
        });
      }

      // Deleta a consulta
      await db.query(
        'DELETE FROM calculos_risco_multa WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      res.json({ 
        success: true, 
        message: 'Consulta excluída com sucesso!' 
      });
    } catch (error) {
      console.error('Erro ao excluir consulta:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao excluir consulta. Tente novamente.' 
      });
    }
  }
}

module.exports = RiscoMultaController;
