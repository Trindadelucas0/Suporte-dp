/**
 * SERVICE: CalendarioService
 * Lógica de negócio para cálculos de calendário e dias úteis
 */

const db = require('../config/database');
const Feriado = require('../models/Feriado');
const moment = require('moment');

class CalendarioService {
  /**
   * Calcula dias úteis em um período
   * @param {Date} dataInicio 
   * @param {Date} dataFim 
   * @param {string} tipoSemana - 'segunda_sexta' ou 'segunda_sabado'
   * @returns {Promise<Object>}
   */
  static async calcularDiasUteis(dataInicio, dataFim, tipoSemana = 'segunda_sexta') {
    const inicio = moment(dataInicio);
    const fim = moment(dataFim);
    const feriados = await Feriado.findAll();
    const feriadosSet = new Set(feriados.map(f => f.data.toISOString().split('T')[0]));

    let diasUteis = 0;
    let domingos = 0;
    let sabados = 0;
    let feriadosCount = 0;
    const detalhes = [];

    let current = inicio.clone();
    while (current.isSameOrBefore(fim)) {
      const dataStr = current.format('YYYY-MM-DD');
      const diaSemana = current.day(); // 0 = domingo, 6 = sábado
      const isFeriado = feriadosSet.has(dataStr);

      if (isFeriado) {
        feriadosCount++;
        detalhes.push({
          data: dataStr,
          tipo: 'feriado',
          nome: feriados.find(f => f.data.toISOString().split('T')[0] === dataStr)?.nome || 'Feriado'
        });
      } else if (diaSemana === 0) {
        domingos++;
        detalhes.push({
          data: dataStr,
          tipo: 'domingo'
        });
      } else if (diaSemana === 6) {
        sabados++;
        if (tipoSemana === 'segunda_sabado') {
          diasUteis++;
          detalhes.push({
            data: dataStr,
            tipo: 'sabado_util'
          });
        } else {
          detalhes.push({
            data: dataStr,
            tipo: 'sabado'
          });
        }
      } else {
        diasUteis++;
        detalhes.push({
          data: dataStr,
          tipo: 'util'
        });
      }

      current.add(1, 'day');
    }

    const totalDias = fim.diff(inicio, 'days') + 1;

    return {
      dataInicio: inicio.format('YYYY-MM-DD'),
      dataFim: fim.format('YYYY-MM-DD'),
      totalDias,
      diasUteis,
      domingos,
      sabados,
      feriados: feriadosCount,
      tipoSemana,
      detalhes,
      memoria: {
        formula: `Dias Úteis = Total de Dias - Domingos - ${tipoSemana === 'segunda_sexta' ? 'Sábados - ' : ''}Feriados`,
        calculo: `${totalDias} - ${domingos} - ${tipoSemana === 'segunda_sexta' ? sabados + ' - ' : ''}${feriadosCount} = ${diasUteis}`
      }
    };
  }

  /**
   * Obtém anotação do usuário para uma data
   */
  static async getAnotacao(userId, data) {
    const result = await db.query(
      'SELECT * FROM calendario_anotacoes WHERE user_id = $1 AND data = $2',
      [userId, data]
    );
    return result.rows[0] || null;
  }

  /**
   * Salva ou atualiza anotação
   */
  static async saveAnotacao(userId, data, anotacao) {
    const result = await db.query(
      `INSERT INTO calendario_anotacoes (user_id, data, anotacao)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, data)
       DO UPDATE SET anotacao = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, data, anotacao]
    );
    return result.rows[0];
  }

  /**
   * Obtém calendário mensal com anotações (OTIMIZADO)
   */
  static async getCalendarioMensal(userId, ano, mes) {
    const inicio = moment(`${ano}-${String(mes).padStart(2, '0')}-01`);
    const fim = inicio.clone().endOf('month');
    
    // Busca tudo de uma vez (otimizado)
    // CORREÇÃO: Tratamento de erro caso a tabela calendario_obrigacoes não exista
    let obrigacoes = { rows: [] };
    try {
      obrigacoes = await db.query(
        `SELECT data, tipo, descricao, observacao, id FROM calendario_obrigacoes 
         WHERE user_id = $1 AND data >= $2 AND data <= $3`,
        [userId, inicio.format('YYYY-MM-DD'), fim.format('YYYY-MM-DD')]
      );
    } catch (error) {
      // Se a tabela não existir, continua sem obrigações (não quebra o calendário)
      console.warn('Tabela calendario_obrigacoes não encontrada. Criando tabela...');
      // Tenta criar a tabela
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS calendario_obrigacoes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            data DATE NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            descricao VARCHAR(255) NOT NULL,
            observacao TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_calendario_obrigacoes_user_data ON calendario_obrigacoes(user_id, data);
          CREATE INDEX IF NOT EXISTS idx_calendario_obrigacoes_tipo ON calendario_obrigacoes(tipo);
        `);
        obrigacoes = { rows: [] };
      } catch (createError) {
        console.error('Erro ao criar tabela calendario_obrigacoes:', createError);
        obrigacoes = { rows: [] };
      }
    }

    const [feriados, anotacoes] = await Promise.all([
      Feriado.findAll(ano),
      db.query(
        `SELECT data, anotacao FROM calendario_anotacoes 
         WHERE user_id = $1 AND data >= $2 AND data <= $3`,
        [userId, inicio.format('YYYY-MM-DD'), fim.format('YYYY-MM-DD')]
      )
    ]);

    // Cria mapas para busca rápida
    const feriadosMap = new Map();
    feriados.forEach(f => {
      const dataStr = moment(f.data).format('YYYY-MM-DD');
      feriadosMap.set(dataStr, f);
    });

    const anotacoesMap = new Map();
    anotacoes.rows.forEach(a => {
      anotacoesMap.set(a.data, a.anotacao);
    });

    const obrigacoesMap = new Map();
    obrigacoes.rows.forEach(o => {
      // Garante que a data está no formato correto
      const dataStr = moment(o.data).format('YYYY-MM-DD');
      if (!obrigacoesMap.has(dataStr)) {
        obrigacoesMap.set(dataStr, []);
      }
      obrigacoesMap.get(dataStr).push(o);
    });
    
    const calendario = [];
    let current = inicio.clone();

    while (current.isSameOrBefore(fim)) {
      const dataStr = current.format('YYYY-MM-DD');
      const feriado = feriadosMap.get(dataStr);
      
      calendario.push({
        data: dataStr,
        dia: current.date(),
        diaSemana: current.day(),
        isFeriado: !!feriado,
        feriadoNome: feriado?.nome || null,
        anotacao: anotacoesMap.get(dataStr) || null,
        obrigacoes: obrigacoesMap.get(dataStr) || []
      });

      current.add(1, 'day');
    }

    return calendario;
  }

  /**
   * Obtém obrigações para uma data
   */
  static async getObrigacoes(userId, data) {
    const result = await db.query(
      'SELECT * FROM calendario_obrigacoes WHERE user_id = $1 AND data = $2 ORDER BY tipo',
      [userId, data]
    );
    return result.rows;
  }

  /**
   * Salva ou atualiza obrigação
   */
  static async saveObrigacao(userId, data, tipo, descricao, observacao = null) {
    const result = await db.query(
      `INSERT INTO calendario_obrigacoes (user_id, data, tipo, descricao, observacao)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data, tipo, descricao, observacao]
    );
    return result.rows[0];
  }

  /**
   * Remove obrigação
   */
  static async removeObrigacao(userId, obrigacaoId) {
    const result = await db.query(
      'DELETE FROM calendario_obrigacoes WHERE id = $1 AND user_id = $2 RETURNING *',
      [obrigacaoId, userId]
    );
    return result.rows[0];
  }

  /**
   * Obtém todas as obrigações do mês
   */
  static async getObrigacoesMes(userId, ano, mes) {
    const inicio = moment(`${ano}-${mes}-01`).format('YYYY-MM-DD');
    const fim = moment(`${ano}-${mes}-01`).endOf('month').format('YYYY-MM-DD');
    
    const result = await db.query(
      'SELECT * FROM calendario_obrigacoes WHERE user_id = $1 AND data >= $2 AND data <= $3 ORDER BY data, tipo',
      [userId, inicio, fim]
    );
    return result.rows;
  }
}

module.exports = CalendarioService;

