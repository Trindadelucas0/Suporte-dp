/**
 * SERVICE: RiscoMultaService
 * Cálculo do período de risco e multa da data base
 * 
 * BASE LEGAL: CLT Art. 477 e Art. 487
 */

const moment = require('moment');

class RiscoMultaService {
  /**
   * Calcula período de risco e multa
   * @param {Date} dataBase - Data base do contrato
   * @param {Date} dataRescisao - Data da rescisão
   * @param {number} salarioBase - Salário base
   * @param {number} valorMedias - Valor das médias
   * @returns {Object}
   */
  static calcular(dataBase, dataRescisao, salarioBase, valorMedias = 0) {
    const base = moment(dataBase);
    const rescisao = moment(dataRescisao);
    
    const memoria = [];

    memoria.push({
      passo: 1,
      descricao: `Data Base: ${base.format('DD/MM/YYYY')}`,
      valor: base.format('DD/MM/YYYY')
    });

    memoria.push({
      passo: 2,
      descricao: `Data da Rescisão: ${rescisao.format('DD/MM/YYYY')}`,
      valor: rescisao.format('DD/MM/YYYY')
    });

    // Calcula período trabalhado
    const diasTrabalhados = rescisao.diff(base, 'days') + 1;
    const mesesTrabalhados = rescisao.diff(base, 'months', true);

    memoria.push({
      passo: 3,
      descricao: `Período Trabalhado: ${mesesTrabalhados.toFixed(2)} meses (${diasTrabalhados} dias)`,
      calculo: `De ${base.format('DD/MM/YYYY')} até ${rescisao.format('DD/MM/YYYY')}`
    });

    // Período de risco: 30 dias após a data base
    const dataFimRisco = base.clone().add(30, 'days');
    const diasNoRisco = rescisao.diff(dataFimRisco, 'days');
    const estaNoRisco = rescisao.isBefore(dataFimRisco) || rescisao.isSame(dataFimRisco);

    memoria.push({
      passo: 4,
      descricao: `Período de Risco: 30 dias após a data base`,
      calculo: `Data base: ${base.format('DD/MM/YYYY')} + 30 dias = ${dataFimRisco.format('DD/MM/YYYY')}`,
      valor: estaNoRisco ? 'DENTRO DO PERÍODO DE RISCO' : 'FORA DO PERÍODO DE RISCO'
    });

    // Base de cálculo (salário + médias)
    const baseCalculo = salarioBase + valorMedias;
    
    if (valorMedias > 0) {
      memoria.push({
        passo: 5,
        descricao: `Base de Cálculo: Salário + Médias`,
        calculo: `R$ ${salarioBase.toFixed(2)} + R$ ${valorMedias.toFixed(2)} = R$ ${baseCalculo.toFixed(2)}`,
        valor: `R$ ${baseCalculo.toFixed(2)}`
      });
    }

    // Multa do Art. 477 (50% sobre aviso prévio não trabalhado)
    // Se rescisão dentro do período de risco, multa de 50% sobre salário
    let valorMulta = 0;
    let tipoMulta = '';

    if (estaNoRisco) {
      valorMulta = baseCalculo * 0.50;
      tipoMulta = 'Multa do Art. 477 (50% - rescisão no período de risco)';
      
      memoria.push({
        passo: 6,
        descricao: `Multa do Art. 477: 50% sobre a base de cálculo`,
        calculo: `R$ ${baseCalculo.toFixed(2)} × 50% = R$ ${valorMulta.toFixed(2)}`,
        valor: `R$ ${valorMulta.toFixed(2)}`,
        destaque: true
      });
    } else {
      memoria.push({
        passo: 6,
        descricao: `Sem multa do Art. 477`,
        calculo: `Rescisão fora do período de risco (após ${dataFimRisco.format('DD/MM/YYYY')})`,
        valor: 'R$ 0,00'
      });
    }

    return {
      dataBase: base.format('YYYY-MM-DD'),
      dataRescisao: rescisao.format('YYYY-MM-DD'),
      dataFimRisco: dataFimRisco.format('YYYY-MM-DD'),
      salarioBase,
      valorMedias,
      baseCalculo: parseFloat(baseCalculo.toFixed(2)),
      diasTrabalhados,
      mesesTrabalhados: parseFloat(mesesTrabalhados.toFixed(2)),
      estaNoRisco,
      diasNoRisco: estaNoRisco ? Math.abs(diasNoRisco) : 0,
      valorMulta: parseFloat(valorMulta.toFixed(2)),
      tipoMulta,
      memoria,
      baseLegal: {
        titulo: 'Consolidação das Leis do Trabalho - CLT',
        artigo: 'Art. 477 e Art. 487',
        descricao: 'Período de risco: 30 dias após a data base. Multa de 50% sobre salário se rescisão dentro do período de risco.'
      }
    };
  }
}

module.exports = RiscoMultaService;

