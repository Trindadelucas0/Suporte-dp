/**
 * SERVICE: FeriasService
 * Cálculo de férias proporcionais
 *
 * BASE LEGAL: CLT Art. 130 e Art. 7º, inciso XVII da CF/88
 */

const moment = require("moment");

class FeriasService {
  /**
   * Calcula AVOS de férias proporcionais (NÃO calcula valores em dinheiro)
   * CORREÇÃO: Este módulo calcula apenas avos, igual ao módulo de 13º salário
   *
   * @param {Date} dataAdmissao
   * @param {Date} dataReferencia
   * @param {Array} afastamentosINSS - Array de {inicio, fim}
   * @param {number} faltas - Número de faltas no período aquisitivo
   * @param {number} feriasJaTiradas - Quantidade de dias de férias já tiradas
   * @returns {Object}
   */
  static calcular(
    dataAdmissao,
    dataReferencia,
    afastamentosINSS = [],
    faltas = 0,
    feriasJaTiradas = 0
  ) {
    const admissao = moment(dataAdmissao);
    const referencia = moment(dataReferencia);

    const memoria = [];
    let mesesCompletos = 0;
    let mesesParciais = 0;

    memoria.push({
      passo: 1,
      descricao: `Data de Admissão: ${admissao.format("DD/MM/YYYY")}`,
      valor: admissao.format("DD/MM/YYYY"),
    });

    memoria.push({
      passo: 2,
      descricao: `Data de Referência: ${referencia.format("DD/MM/YYYY")}`,
      valor: referencia.format("DD/MM/YYYY"),
    });

    // Calcula meses trabalhados mês a mês (igual ao 13º)
    let current = admissao.clone();
    const meses = [];

    while (current.isSameOrBefore(referencia, "month")) {
      const inicioMes = current.clone().startOf("month");
      const fimMes = current.clone().endOf("month");
      const dataLimite = current.isSame(referencia, "month")
        ? referencia
        : fimMes;

      // Calcula dias trabalhados no mês
      let diasTrabalhados = dataLimite.diff(inicioMes, "days") + 1;
      const totalDiasMes = fimMes.daysInMonth();

      // Desconta afastamentos INSS
      for (const afastamento of afastamentosINSS) {
        const inicioAfast = moment(afastamento.inicio);
        const fimAfast = moment(afastamento.fim || referencia);

        if (
          inicioAfast.isSameOrBefore(fimMes) &&
          fimAfast.isSameOrAfter(inicioMes)
        ) {
          const inicioDesconto = moment.max(inicioAfast, inicioMes);
          const fimDesconto = moment.min(fimAfast, dataLimite);
          const diasDescontados = fimDesconto.diff(inicioDesconto, "days") + 1;
          diasTrabalhados -= diasDescontados;
        }
      }

      diasTrabalhados = Math.max(0, diasTrabalhados);

      // Regra: 15 dias ou mais = 1 avo (igual ao 13º)
      const avo = diasTrabalhados >= 15 ? 1 : 0;

      meses.push({
        mes: current.format("MM/YYYY"),
        diasTrabalhados,
        totalDiasMes,
        avo,
        observacao:
          avo === 1 ? "Mês completo (≥15 dias)" : "Mês incompleto (<15 dias)",
      });

      if (avo === 1) {
        mesesCompletos++;
      } else if (diasTrabalhados > 0) {
        mesesParciais++;
      }

      current.add(1, "month");
    }

    const totalAvos = mesesCompletos;

    // Calcula período total
    const diasTotais = referencia.diff(admissao, "days") + 1;
    const mesesTotais = referencia.diff(admissao, "months") + 1;

    memoria.push({
      passo: 3,
      descricao: `Período analisado: ${mesesTotais} meses (${diasTotais} dias totais)`,
      calculo: `De ${admissao.format("DD/MM/YYYY")} até ${referencia.format(
        "DD/MM/YYYY"
      )}`,
      valor: `${mesesTotais} meses`,
    });

    if (afastamentosINSS.length > 0) {
      const diasAfastamento = afastamentosINSS.reduce((total, afast) => {
        const inicio = moment(afast.inicio);
        const fim = moment(afast.fim || referencia);
        return total + (fim.diff(inicio, "days") + 1);
      }, 0);

      memoria.push({
        passo: 4,
        descricao: `Afastamentos por INSS: ${afastamentosINSS.length} período(s) totalizando ${diasAfastamento} dias`,
        calculo: `Esses dias não contam para o cálculo dos avos`,
        valor: `${diasAfastamento} dias descontados`,
      });
    }

    memoria.push({
      passo: afastamentosINSS.length > 0 ? 5 : 4,
      descricao: `Análise detalhada: Verificando cada mês individualmente`,
      calculo: `Para cada mês: se trabalhou 15+ dias = 1 avo, se trabalhou <15 dias = 0 avos`,
    });

    // Desconta férias já tiradas (em avos)
    const avosJaTirados = Math.floor((feriasJaTiradas / 30) * 12); // Converte dias para avos aproximados
    const avosDisponiveis = totalAvos - avosJaTirados;
    const avosFinais = avosDisponiveis;

    memoria.push({
      passo: afastamentosINSS.length > 0 ? 6 : 5,
      descricao: `Total de Avos Calculados: ${totalAvos}/12`,
      calculo: `${mesesCompletos} meses completos (15+ dias) = ${totalAvos} avos`,
      valor: `${totalAvos}/12`,
      destaque: true,
    });

    if (feriasJaTiradas > 0) {
      memoria.push({
        passo: afastamentosINSS.length > 0 ? 7 : 6,
        descricao: `Férias já tiradas: ${feriasJaTiradas} dias (aproximadamente ${avosJaTirados} avos)`,
        calculo: `${totalAvos} avos - ${avosJaTirados} avos = ${avosDisponiveis} avos disponíveis`,
        valor: `${avosDisponiveis}/12 avos disponíveis`,
      });
    }

    return {
      tipo: "ferias",
      dataAdmissao: admissao.format("YYYY-MM-DD"),
      dataReferencia: referencia.format("YYYY-MM-DD"),
      totalAvos: avosFinais,
      mesesCompletos,
      mesesParciais,
      meses,
      feriasJaTiradas,
      avosJaTirados,
      avosDisponiveis,
      memoria,
      baseLegal: {
        titulo: "Consolidação das Leis do Trabalho - CLT",
        artigo: "Art. 130",
        descricao:
          "Férias proporcionais calculadas em avos conforme período aquisitivo. Cada mês com 15+ dias trabalhados = 1 avo.",
      },
    };
  }
}

module.exports = FeriasService;
