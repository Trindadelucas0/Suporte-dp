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
   * Obtém calendário mensal com anotações
   */
  static async getCalendarioMensal(userId, ano, mes) {
    const inicio = moment(`${ano}-${mes}-01`);
    const fim = inicio.clone().endOf('month');
    const feriados = await Feriado.findAll(ano);
    
    const calendario = [];
    let current = inicio.clone();

    while (current.isSameOrBefore(fim)) {
      const dataStr = current.format('YYYY-MM-DD');
      const feriado = feriados.find(f => 
        moment(f.data).format('YYYY-MM-DD') === dataStr
      );

      const anotacao = await this.getAnotacao(userId, dataStr);

      calendario.push({
        data: dataStr,
        dia: current.date(),
        diaSemana: current.day(),
        isFeriado: !!feriado,
        feriadoNome: feriado?.nome || null,
        anotacao: anotacao?.anotacao || null
      });

      current.add(1, 'day');
    }

    return calendario;
  }
}

module.exports = CalendarioService;

