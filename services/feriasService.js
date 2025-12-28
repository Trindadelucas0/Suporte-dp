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
   *
   * REGRA LEGAL: CLT Art. 130 - Férias proporcionais
   * IMPORTANTE: Este cálculo é INDEPENDENTE do cálculo de 13º salário
   *
   * Base de cálculo: Período aquisitivo de férias
   * Regra: Cada mês em que o empregado trabalhou 15 dias ou mais = 1/12 avo
   *
   * DIFERENÇAS em relação ao 13º salário:
   * - Férias: Baseado no período aquisitivo (12 meses)
   * - 13º: Baseado no ano-calendário
   * - Ambos usam a mesma regra de 15+ dias, mas são cálculos independentes
   *
   * @param {Date} dataAdmissao - Data de admissão do funcionário
   * @param {Date} dataReferencia - Data de referência para cálculo (fim do período aquisitivo)
   * @param {Array} afastamentosINSS - Array de {inicio, fim} - Períodos de afastamento por INSS
   * @param {number} faltas - Número de faltas (não usado no cálculo de avos, apenas para referência)
   * @param {number} feriasJaTiradas - Quantidade de dias de férias já tiradas (para desconto)
   * @returns {Object} Resultado com totalAvos, meses, memoria, etc.
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

    // Calcula meses trabalhados mês a mês no período aquisitivo de férias
    // IMPORTANTE: Esta lógica é específica para férias, não reutiliza código do 13º
    let current = admissao.clone();
    const meses = [];

    while (current.isSameOrBefore(referencia, "month")) {
      const inicioMes = current.clone().startOf("month");
      const fimMes = current.clone().endOf("month");
      // Se for o mês de referência, usa a data de referência como limite
      const dataLimite = current.isSame(referencia, "month")
        ? referencia
        : fimMes;

      // Calcula dias trabalhados no mês (do início do mês até a data limite)
      let diasTrabalhados = dataLimite.diff(inicioMes, "days") + 1;
      const totalDiasMes = fimMes.daysInMonth();

      // Desconta afastamentos por INSS (esses dias não contam para o período aquisitivo)
      for (const afastamento of afastamentosINSS) {
        const inicioAfast = moment(afastamento.inicio);
        const fimAfast = moment(afastamento.fim || referencia);

        // Verifica se o afastamento se sobrepõe ao mês atual
        if (
          inicioAfast.isSameOrBefore(fimMes) &&
          fimAfast.isSameOrAfter(inicioMes)
        ) {
          // Calcula a interseção entre o afastamento e o mês
          const inicioDesconto = moment.max(inicioAfast, inicioMes);
          const fimDesconto = moment.min(fimAfast, dataLimite);
          const diasDescontados = fimDesconto.diff(inicioDesconto, "days") + 1;
          diasTrabalhados -= diasDescontados;
        }
      }

      // Garante que não fica negativo
      diasTrabalhados = Math.max(0, diasTrabalhados);

      // REGRA LEGAL DE FÉRIAS: 15 dias ou mais trabalhados no mês = 1 avo (1/12)
      // Esta regra é específica para férias conforme CLT Art. 130
      // NÃO é "mês completo" ou "mês fechado", apenas 15+ dias trabalhados
      const avo = diasTrabalhados >= 15 ? 1 : 0;

      meses.push({
        mes: current.format("MM/YYYY"),
        diasTrabalhados,
        totalDiasMes,
        avo,
        observacao:
          avo === 1
            ? "15+ dias trabalhados = 1 avo"
            : "Menos de 15 dias = 0 avos",
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
      descricao: `Análise detalhada: Verificando cada mês do período aquisitivo`,
      calculo: `Regra de férias (CLT Art. 130): Para cada mês, se trabalhou 15+ dias = 1 avo (1/12), se trabalhou <15 dias = 0 avos. Não exige mês fechado.`,
      observacao:
        "Esta regra é específica para férias e independe do cálculo de 13º salário",
    });

    // Desconta férias já tiradas (em avos)
    const avosJaTirados = Math.floor((feriasJaTiradas / 30) * 12); // Converte dias para avos aproximados
    const avosDisponiveis = totalAvos - avosJaTirados;
    const avosFinais = avosDisponiveis;

    memoria.push({
      passo: afastamentosINSS.length > 0 ? 6 : 5,
      descricao: `Total de Avos de Férias Calculados: ${totalAvos}/12`,
      calculo: `${mesesCompletos} meses com 15+ dias trabalhados = ${totalAvos} avos de férias`,
      valor: `${totalAvos}/12`,
      destaque: true,
      observacao:
        "Máximo de 12/12 avos (período aquisitivo completo de 12 meses)",
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
          "Férias proporcionais calculadas em avos conforme período aquisitivo de 12 meses. Cada mês em que o empregado trabalhou 15 dias ou mais gera 1/12 avo de férias. O cálculo é independente do 13º salário e não exige mês completo ou fechado, apenas 15+ dias trabalhados.",
      },
    };
  }
}

module.exports = FeriasService;
