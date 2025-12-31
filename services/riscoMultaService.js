/**
 * SERVICE: RiscoMultaService
 * Análise de período de risco e multa da data base
 * 
 * BASE LEGAL: Lei nº 7.238/84 – Art 9º
 * 
 * LÓGICA:
 * - Calcula exatamente 30 dias que ANTECEDEM a data base
 * - Multa = valor integral (um salário mensal completo)
 */

const moment = require('moment');

class RiscoMultaService {
  /**
   * Calcula o período de risco a partir da data base
   * @param {string} dataBase - Data base do contrato (YYYY-MM-DD)
   * @returns {Object}
   */
  static calcular(dataBase) {
    const base = moment(dataBase);
    
    const memoria = [];

    // 1. Data Base
    memoria.push({
      passo: 1,
      descricao: `Data Base: ${base.format('DD/MM/YYYY')}`,
      valor: base.format('DD/MM/YYYY')
    });

    // 2. Período de Risco: 30 dias que ANTECEDEM a data base
    // IMPORTANTE: Exatamente 30 dias, não 31 mesmo que o mês tenha 31 dias
    const dataInicioRisco = base.clone().subtract(30, 'days');
    const dataFimRisco = base.clone().subtract(1, 'day'); // Até o dia anterior à data base

    memoria.push({
      passo: 2,
      descricao: `Período de Risco: 30 dias que antecedem a data base`,
      calculo: `Data base: ${base.format('DD/MM/YYYY')} - 30 dias = ${dataInicioRisco.format('DD/MM/YYYY')} até ${dataFimRisco.format('DD/MM/YYYY')}`,
      valor: `De ${dataInicioRisco.format('DD/MM/YYYY')} até ${dataFimRisco.format('DD/MM/YYYY')}`,
      destaque: true
    });

    // 3. Explicação da Multa
    memoria.push({
      passo: 3,
      descricao: `Quando ocorre a multa?`,
      calculo: `Se a dispensa SEM JUSTA CAUSA ocorrer entre ${dataInicioRisco.format('DD/MM/YYYY')} e ${dataFimRisco.format('DD/MM/YYYY')}, o empregado terá direito à indenização adicional equivalente a um salário mensal (valor integral)`,
      valor: 'Período crítico para dispensa',
      destaque: true
    });

    // 4. Dias do período
    const diasPeriodo = 30;
    memoria.push({
      passo: 4,
      descricao: `Duração do Período de Risco`,
      calculo: `Exatamente ${diasPeriodo} dias corridos que antecedem a data base`,
      valor: `${diasPeriodo} dias`
    });

    // 5. Data de segurança (após a data base)
    memoria.push({
      passo: 5,
      descricao: `Data de Segurança`,
      calculo: `A partir de ${base.format('DD/MM/YYYY')} (data base), não há mais risco de multa por período de risco`,
      valor: base.format('DD/MM/YYYY')
    });

    return {
      dataBase: base.format('YYYY-MM-DD'),
      dataInicioRisco: dataInicioRisco.format('YYYY-MM-DD'),
      dataFimRisco: dataFimRisco.format('YYYY-MM-DD'),
      diasPeriodo,
      memoria,
      baseLegal: {
        titulo: 'Lei nº 7.238/84',
        artigo: 'Art. 9º',
        descricao: 'O empregado dispensado, SEM JUSTA CAUSA no período de 30 (trinta) dias que antecede a data de sua correção salarial, terá direito à indenização adicional equivalente a um salário mensal (valor integral).'
      },
      observacoes: {
        sumula182: 'TST – Súmula 182: O tempo do aviso prévio, mesmo indenizado, conta-se para efeito da indenização adicional prevista no art. 9º da Lei nº 6.708, de 30.10.1979. (mantida - Res. 121/2003, DJ 19, 20 e 21.11.2003)'
      }
    };
  }
}

module.exports = RiscoMultaService;
