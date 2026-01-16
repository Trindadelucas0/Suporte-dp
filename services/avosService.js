/**
 * SERVICE: AvosService
 * Cálculo de avos para 13º salário
 * 
 * BASE LEGAL: Lei nº 4.090/1962 - Art. 1º, Art. 2º, Art. 3º e Art. 4º
 */

const moment = require('moment');

class AvosService {
  /**
   * Calcula avos de 13º salário
   * @param {Date} dataAdmissao 
   * @param {Date} dataReferencia 
   * @param {Array} afastamentosINSS - Array de {inicio, fim}
   * @returns {Object}
   */
  static calcularDecimoTerceiro(dataAdmissao, dataReferencia, afastamentosINSS = []) {
    const admissao = moment(dataAdmissao);
    const referencia = moment(dataReferencia);
    
    const memoria = [];
    let mesesCompletos = 0;
    let mesesParciais = 0;

    memoria.push({
      passo: 1,
      descricao: `Data de Admissão: ${admissao.format('DD/MM/YYYY')}`,
      valor: admissao.format('DD/MM/YYYY')
    });

    memoria.push({
      passo: 2,
      descricao: `Data de Referência: ${referencia.format('DD/MM/YYYY')}`,
      valor: referencia.format('DD/MM/YYYY')
    });

    // Calcula meses trabalhados
    let current = admissao.clone();
    const meses = [];

    while (current.isSameOrBefore(referencia, 'month')) {
      const inicioMes = current.clone().startOf('month');
      const fimMes = current.clone().endOf('month');
      const dataLimite = current.isSame(referencia, 'month') 
        ? referencia 
        : fimMes;

      // Calcula dias trabalhados no mês
      let diasTrabalhados = dataLimite.diff(inicioMes, 'days') + 1;
      const totalDiasMes = fimMes.daysInMonth();

      // Desconta afastamentos INSS
      for (const afastamento of afastamentosINSS) {
        const inicioAfast = moment(afastamento.inicio);
        const fimAfast = moment(afastamento.fim || referencia);

        if (inicioAfast.isSameOrBefore(fimMes) && fimAfast.isSameOrAfter(inicioMes)) {
          const inicioDesconto = moment.max(inicioAfast, inicioMes);
          const fimDesconto = moment.min(fimAfast, dataLimite);
          const diasDescontados = fimDesconto.diff(inicioDesconto, 'days') + 1;
          diasTrabalhados -= diasDescontados;
        }
      }

      diasTrabalhados = Math.max(0, diasTrabalhados);

      // Regra: 15 dias ou mais = 1 avo
      const avo = diasTrabalhados >= 15 ? 1 : 0;

      meses.push({
        mes: current.format('MM/YYYY'),
        diasTrabalhados,
        totalDiasMes,
        avo,
        observacao: avo === 1 ? 'Mês completo (≥15 dias)' : 'Mês incompleto (<15 dias)'
      });

      if (avo === 1) {
        mesesCompletos++;
      } else if (diasTrabalhados > 0) {
        mesesParciais++;
      }

      current.add(1, 'month');
    }

    const totalAvos = mesesCompletos;

    // Calcula período total
    const diasTotais = referencia.diff(admissao, 'days') + 1;
    const mesesTotais = referencia.diff(admissao, 'months') + 1;

    memoria.push({
      passo: 3,
      descricao: `Período analisado: ${mesesTotais} meses (${diasTotais} dias totais)`,
      calculo: `De ${admissao.format('DD/MM/YYYY')} até ${referencia.format('DD/MM/YYYY')}`,
      valor: `${mesesTotais} meses`
    });

    if (afastamentosINSS.length > 0) {
      const diasAfastamento = afastamentosINSS.reduce((total, afast) => {
        const inicio = moment(afast.inicio);
        const fim = moment(afast.fim || referencia);
        return total + (fim.diff(inicio, 'days') + 1);
      }, 0);

      memoria.push({
        passo: 4,
        descricao: `Afastamentos por INSS: ${afastamentosINSS.length} período(s) totalizando ${diasAfastamento} dias`,
        calculo: `Esses dias não contam para o cálculo dos avos`,
        valor: `${diasAfastamento} dias descontados`
      });
    }

    memoria.push({
      passo: afastamentosINSS.length > 0 ? 5 : 4,
      descricao: `Análise detalhada: Verificando cada mês individualmente`,
      calculo: `Para cada mês: se trabalhou 15+ dias = 1 avo, se trabalhou <15 dias = 0 avos`
    });

    memoria.push({
      passo: afastamentosINSS.length > 0 ? 6 : 5,
      descricao: `Total de Avos Calculados: ${totalAvos}/12`,
      calculo: `${mesesCompletos} meses completos (15+ dias) = ${totalAvos} avos`,
      valor: `${totalAvos}/12`,
      destaque: true
    });

    return {
      tipo: 'decimo_terceiro',
      dataAdmissao: admissao.format('YYYY-MM-DD'),
      dataReferencia: referencia.format('YYYY-MM-DD'),
      totalAvos,
      mesesCompletos,
      mesesParciais,
      meses,
      memoria,
      baseLegal: {
        titulo: 'Lei nº 4.090, de 13 de julho de 1962',
        artigo: 'Art. 1º, Art. 2º, Art. 3º e Art. 4º',
        descricao: '13º salário proporcional: 1/12 por mês trabalhado, considerando mês completo quando houver 15 dias ou mais de trabalho (Art. 1º, § 2º). As faltas legais e justificadas não são deduzidas (Art. 2º).'
      }
    };
  }

}

module.exports = AvosService;

