/**
 * SERVICE: ContratoExperienciaService
 * Cálculo de quebra de contrato de experiência
 * 
 * BASE LEGAL: CLT Art. 445 a Art. 451
 */

const moment = require('moment');

class ContratoExperienciaService {
  /**
   * Calcula quebra de contrato de experiência
   * @param {Date} dataInicio - Data de início do contrato
   * @param {Date} dataFimPrevisto - Data prevista de término do contrato
   * @param {Date} dataEncerramento - Data real de encerramento
   * @param {number} salarioBase - Salário base
   * @param {number} valorMedias - Valor das médias
   * @returns {Object}
   */
  static calcular(dataInicio, dataFimPrevisto, dataEncerramento, salarioBase, valorMedias = 0) {
    const inicio = moment(dataInicio);
    const fimPrevisto = moment(dataFimPrevisto);
    const encerramento = moment(dataEncerramento);
    
    const memoria = [];

    memoria.push({
      passo: 1,
      descricao: `Data de Início: ${inicio.format('DD/MM/YYYY')}`,
      valor: inicio.format('DD/MM/YYYY')
    });

    memoria.push({
      passo: 2,
      descricao: `Data Prevista de Término: ${fimPrevisto.format('DD/MM/YYYY')}`,
      valor: fimPrevisto.format('DD/MM/YYYY')
    });

    memoria.push({
      passo: 3,
      descricao: `Data Real de Encerramento: ${encerramento.format('DD/MM/YYYY')}`,
      valor: encerramento.format('DD/MM/YYYY')
    });

    // Duração prevista do contrato
    const diasPrevistos = fimPrevisto.diff(inicio, 'days') + 1;
    const diasTrabalhados = encerramento.diff(inicio, 'days') + 1;
    const diasAntecipados = fimPrevisto.diff(encerramento, 'days');

    memoria.push({
      passo: 4,
      descricao: `Duração Prevista: ${diasPrevistos} dias`,
      calculo: `De ${inicio.format('DD/MM/YYYY')} até ${fimPrevisto.format('DD/MM/YYYY')}`
    });

    memoria.push({
      passo: 5,
      descricao: `Dias Trabalhados: ${diasTrabalhados} dias`,
      calculo: `De ${inicio.format('DD/MM/YYYY')} até ${encerramento.format('DD/MM/YYYY')}`
    });

    // Verifica quem quebrou o contrato
    const quebradoPeloEmpregador = encerramento.isBefore(fimPrevisto);
    const quebradoPeloEmpregado = encerramento.isAfter(fimPrevisto) || encerramento.isSame(fimPrevisto, 'day');

    memoria.push({
      passo: 6,
      descricao: `Análise da Quebra`,
      calculo: quebradoPeloEmpregador 
        ? `Encerramento ANTES da data prevista = Quebra pelo EMPREGADOR`
        : `Encerramento NA ou APÓS a data prevista = Quebra pelo EMPREGADO`,
      valor: quebradoPeloEmpregador ? 'Quebra pelo Empregador' : 'Quebra pelo Empregado'
    });

    // Base de cálculo
    const baseCalculo = salarioBase + valorMedias;
    
    if (valorMedias > 0) {
      memoria.push({
        passo: 7,
        descricao: `Base de Cálculo: Salário + Médias`,
        calculo: `R$ ${salarioBase.toFixed(2)} + R$ ${valorMedias.toFixed(2)} = R$ ${baseCalculo.toFixed(2)}`,
        valor: `R$ ${baseCalculo.toFixed(2)}`
      });
    }

    // Cálculo das verbas rescisórias
    let valorAvisoPrevio = 0;
    let valorFgts = 0;
    let valorMultaFgts = 0;
    let valor13Proporcional = 0;
    let valorFeriasProporcionais = 0;
    let valorTercoFerias = 0;
    let valorTotal = 0;

    // Aviso prévio proporcional (se quebrado pelo empregador)
    if (quebradoPeloEmpregador) {
      const mesesTrabalhados = encerramento.diff(inicio, 'months', true);
      valorAvisoPrevio = (baseCalculo / 30) * 30; // 30 dias de aviso prévio
      
      memoria.push({
        passo: 8,
        descricao: `Aviso Prévio: 30 dias`,
        calculo: `(R$ ${baseCalculo.toFixed(2)} ÷ 30) × 30 dias = R$ ${valorAvisoPrevio.toFixed(2)}`,
        valor: `R$ ${valorAvisoPrevio.toFixed(2)}`
      });
    }

    // 13º proporcional
    const meses13 = Math.floor(encerramento.diff(inicio, 'months', true));
    valor13Proporcional = (baseCalculo / 12) * meses13;
    
    memoria.push({
      passo: 9,
      descricao: `13º Salário Proporcional: ${meses13} avos`,
      calculo: `(R$ ${baseCalculo.toFixed(2)} ÷ 12) × ${meses13} = R$ ${valor13Proporcional.toFixed(2)}`,
      valor: `R$ ${valor13Proporcional.toFixed(2)}`
    });

    // Férias proporcionais
    const mesesFerias = Math.floor(encerramento.diff(inicio, 'months', true));
    const diasFerias = Math.floor((30 / 12) * mesesFerias);
    valorFeriasProporcionais = (baseCalculo / 30) * diasFerias;
    valorTercoFerias = valorFeriasProporcionais / 3;
    
    memoria.push({
      passo: 10,
      descricao: `Férias Proporcionais: ${diasFerias} dias`,
      calculo: `(R$ ${baseCalculo.toFixed(2)} ÷ 30) × ${diasFerias} = R$ ${valorFeriasProporcionais.toFixed(2)}`,
      valor: `R$ ${valorFeriasProporcionais.toFixed(2)}`
    });

    memoria.push({
      passo: 11,
      descricao: `1/3 Constitucional sobre Férias`,
      calculo: `R$ ${valorFeriasProporcionais.toFixed(2)} ÷ 3 = R$ ${valorTercoFerias.toFixed(2)}`,
      valor: `R$ ${valorTercoFerias.toFixed(2)}`
    });

    // FGTS (8% sobre salário)
    valorFgts = baseCalculo * 0.08;
    
    memoria.push({
      passo: 12,
      descricao: `FGTS: 8% sobre base de cálculo`,
      calculo: `R$ ${baseCalculo.toFixed(2)} × 8% = R$ ${valorFgts.toFixed(2)}`,
      valor: `R$ ${valorFgts.toFixed(2)}`
    });

    // Multa de 40% sobre FGTS (se quebrado pelo empregador)
    if (quebradoPeloEmpregador) {
      valorMultaFgts = valorFgts * 0.40;
      
      memoria.push({
        passo: 13,
        descricao: `Multa de 40% sobre FGTS`,
        calculo: `R$ ${valorFgts.toFixed(2)} × 40% = R$ ${valorMultaFgts.toFixed(2)}`,
        valor: `R$ ${valorMultaFgts.toFixed(2)}`
      });
    }

    // Total
    valorTotal = valorAvisoPrevio + valor13Proporcional + valorFeriasProporcionais + 
                 valorTercoFerias + valorFgts + valorMultaFgts;

    memoria.push({
      passo: 14,
      descricao: `VALOR TOTAL DAS VERBAS RESCISÓRIAS: R$ ${valorTotal.toFixed(2)}`,
      calculo: `Aviso: R$ ${valorAvisoPrevio.toFixed(2)} + 13º: R$ ${valor13Proporcional.toFixed(2)} + Férias: R$ ${valorFeriasProporcionais.toFixed(2)} + 1/3: R$ ${valorTercoFerias.toFixed(2)} + FGTS: R$ ${valorFgts.toFixed(2)} + Multa FGTS: R$ ${valorMultaFgts.toFixed(2)}`,
      valor: `R$ ${valorTotal.toFixed(2)}`,
      destaque: true
    });

    return {
      dataInicio: inicio.format('YYYY-MM-DD'),
      dataFimPrevisto: fimPrevisto.format('YYYY-MM-DD'),
      dataEncerramento: encerramento.format('YYYY-MM-DD'),
      salarioBase,
      valorMedias,
      baseCalculo: parseFloat(baseCalculo.toFixed(2)),
      diasPrevistos,
      diasTrabalhados,
      diasAntecipados,
      quebradoPeloEmpregador,
      quebradoPeloEmpregado,
      mesesTrabalhados: parseFloat(meses13.toFixed(2)),
      valorAvisoPrevio: parseFloat(valorAvisoPrevio.toFixed(2)),
      valor13Proporcional: parseFloat(valor13Proporcional.toFixed(2)),
      valorFeriasProporcionais: parseFloat(valorFeriasProporcionais.toFixed(2)),
      valorTercoFerias: parseFloat(valorTercoFerias.toFixed(2)),
      valorFgts: parseFloat(valorFgts.toFixed(2)),
      valorMultaFgts: parseFloat(valorMultaFgts.toFixed(2)),
      valorTotal: parseFloat(valorTotal.toFixed(2)),
      memoria,
      baseLegal: {
        titulo: 'Consolidação das Leis do Trabalho - CLT',
        artigo: 'Art. 445 a Art. 451',
        descricao: 'Contrato de experiência pode ser prorrogado por até 90 dias. Quebra antecipada gera direito a verbas rescisórias proporcionais.'
      }
    };
  }
}

module.exports = ContratoExperienciaService;

