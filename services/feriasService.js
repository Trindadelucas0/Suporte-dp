/**
 * SERVICE: FeriasService
 * Cálculo de férias proporcionais
 *
 * BASE LEGAL: CLT Art. 130 e Art. 134
 */

const moment = require("moment");
const INSSService = require("./inssService");
const IRRFService = require("./irrfService");

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
        artigo: "Art. 130 e Art. 134",
        descricao:
          "Art. 130 Após cada período de 12 (doze) meses de vigência do contrato de trabalho, o empregado terá direito a férias, na seguinte proporção: (Redação dada pelo Decreto-lei nº 1.535, de 13.4.1977) I - 30 (trinta) dias corridos, quando não houver faltado ao serviço mais de 5 (cinco) vezes; (Incluído pelo Decreto-lei nº 1.535, de 13.4.1977) II - 24 (vinte e quatro) dias corridos, quando houver tido de 6 (seis) a 14 (quatorze) faltas; (Incluído pelo Decreto-lei nº 1.535, de 13.4.1977) III - 18 (dezoito) dias corridos, quando houver tido de 15 (quinze) a 23 (vinte e três) faltas; (Incluído pelo Decreto-lei nº 1.535, de 13.4.1977) IV - 12 (doze) dias corridos, quando houver tido de 24 (vinte e quatro) a 32 (trinta e duas) faltas. (Incluído pelo Decreto-lei nº 1.535, de 13.4.1977) § 1º É vedado descontar, do período de férias, as faltas do empregado ao serviço. (Incluído pelo Decreto-lei nº 1.535, de 13.4.1977) § 2º O período das férias será computado, para todos os efeitos, como tempo de serviço. Art. 134 As férias serão concedidas por ato do empregador, em um só período, nos 12 (doze) meses subseqüentes à data em que o empregado tiver adquirido o direito. § 1º Desde que haja concordância do empregado, as férias poderão ser usufruídas em até três períodos, sendo que um deles não poderá ser inferior a quatorze dias corridos e os demais não poderão ser inferiores a cinco dias corridos, cada um. § 3º É vedado o início das férias no período de dois dias que antecede feriado ou dia de repouso semanal remunerado.",
      },
    };
  }

  /**
   * Calcula valores monetários de férias com impostos
   * 
   * @param {Object} dados - Dados para cálculo
   * @param {string} dados.periodoAquisitivoInicio - Data início do período aquisitivo
   * @param {string} dados.periodoAquisitivoFim - Data fim do período aquisitivo
   * @param {string} dados.dataConcessaoInicio - Data início da concessão
   * @param {string} dados.dataConcessaoFim - Data fim da concessão
   * @param {number} dados.salario - Salário do funcionário
   * @param {boolean} dados.venderUmTerco - Se deseja vender 1/3 das férias (abono pecuniário)
   * @param {number} dados.dependentes - Número de dependentes para IR
   * @param {number} dados.pensaoAlimenticia - Valor da pensão alimentícia
   * @param {boolean} dados.faltouInjustificada - Se faltou injustificadamente
   * @param {number} dados.diasFaltas - Quantidade de dias de faltas injustificadas
   * @param {boolean} dados.afastamentoAuxilioDoenca - Se teve afastamento por auxílio-doença
   * @param {string} dados.afastamentoInicio - Data início do afastamento
   * @param {string} dados.afastamentoFim - Data fim do afastamento
   * @param {number} dados.ano - Ano para cálculo de impostos
   * @returns {Object} Resultado com valores monetários
   */
  static calcularValores(dados) {
    const {
      periodoAquisitivoInicio,
      periodoAquisitivoFim,
      dataConcessaoInicio,
      dataConcessaoFim,
      salario,
      venderUmTerco = false,
      dependentes = 0,
      pensaoAlimenticia = 0,
      faltouInjustificada = false,
      diasFaltas = 0,
      afastamentoAuxilioDoenca = false,
      afastamentoInicio,
      afastamentoFim,
      ano = new Date().getFullYear()
    } = dados;

    const memoria = [];
    const salarioNum = parseFloat(salario) || 0;

    // Calcula dias de férias (diferença entre data início e fim da concessão)
    const dataInicio = moment(dataConcessaoInicio);
    const dataFim = moment(dataConcessaoFim);
    const diasFerias = dataFim.diff(dataInicio, "days") + 1;

    memoria.push({
      passo: 1,
      descricao: `Período Aquisitivo: ${moment(periodoAquisitivoInicio).format("DD/MM/YYYY")} a ${moment(periodoAquisitivoFim).format("DD/MM/YYYY")}`,
      valor: "12 meses"
    });

    memoria.push({
      passo: 2,
      descricao: `Data Concessão: ${dataInicio.format("DD/MM/YYYY")}`,
      valor: `${diasFerias} dias`
    });

    memoria.push({
      passo: 3,
      descricao: `Salário: R$ ${salarioNum.toFixed(2)}`,
      valor: salarioNum.toFixed(2)
    });

    // Valor das férias (salário proporcional aos dias)
    // Usa divisor padrão de 30 dias conforme CLT Art. 64
    const valorFerias = (salarioNum / 30) * diasFerias;

    memoria.push({
      passo: 4,
      descricao: `Valor das Férias: ${diasFerias} dias × (R$ ${salarioNum.toFixed(2)} ÷ 30)`,
      calculo: `${diasFerias} × (R$ ${salarioNum.toFixed(2)} ÷ 30) = R$ ${valorFerias.toFixed(2)}`,
      valor: valorFerias.toFixed(2)
    });

    // Adicional de 1/3 (sempre calculado sobre o valor das férias)
    const adicionalUmTerco = valorFerias / 3;

    memoria.push({
      passo: 5,
      descricao: `Adicional de 1/3: R$ ${valorFerias.toFixed(2)} ÷ 3`,
      calculo: `R$ ${valorFerias.toFixed(2)} ÷ 3 = R$ ${adicionalUmTerco.toFixed(2)}`,
      valor: adicionalUmTerco.toFixed(2)
    });

    // Abono pecuniário (se vender 1/3)
    let abonoPecuniario = 0;
    if (venderUmTerco) {
      // Abono pecuniário = 1/3 do valor das férias + 1/3 do adicional
      abonoPecuniario = (valorFerias / 3) + (adicionalUmTerco / 3);
      
      memoria.push({
        passo: 6,
        descricao: `Abono Pecuniário (venda de 1/3): (R$ ${valorFerias.toFixed(2)} ÷ 3) + (R$ ${adicionalUmTerco.toFixed(2)} ÷ 3)`,
        calculo: `R$ ${(valorFerias / 3).toFixed(2)} + R$ ${(adicionalUmTerco / 3).toFixed(2)} = R$ ${abonoPecuniario.toFixed(2)}`,
        valor: abonoPecuniario.toFixed(2)
      });
    }

    // Base de cálculo para impostos = Valor das férias + Adicional de 1/3
    const baseCalculoImpostos = valorFerias + adicionalUmTerco;

    // Calcula INSS sobre a base
    const calculoINSS = INSSService.calcular(baseCalculoImpostos, false, ano);
    const valorINSS = calculoINSS.valorINSS;

    memoria.push({
      passo: venderUmTerco ? 7 : 6,
      descricao: `INSS: Calculado sobre R$ ${baseCalculoImpostos.toFixed(2)}`,
      calculo: `Base: R$ ${baseCalculoImpostos.toFixed(2)}`,
      valor: valorINSS.toFixed(2)
    });

    // Base para IR = Base de cálculo - INSS
    const baseIR = baseCalculoImpostos - valorINSS;

    // Calcula IRRF
    const calculoIRRF = IRRFService.calcular(
      baseIR,
      valorINSS,
      parseInt(dependentes) || 0,
      parseFloat(pensaoAlimenticia) || 0,
      false, // não usa dedução simplificada
      ano
    );
    const valorIRRF = calculoIRRF.valorIRRF;

    memoria.push({
      passo: venderUmTerco ? 8 : 7,
      descricao: `IRRF: Calculado sobre base de R$ ${baseIR.toFixed(2)}`,
      calculo: `Base: R$ ${baseIR.toFixed(2)} | Dependentes: ${dependentes} | Pensão: R$ ${parseFloat(pensaoAlimenticia).toFixed(2)}`,
      valor: valorIRRF.toFixed(2)
    });

    // IRRF com dedução simplificada (se aplicável)
    const calculoIRRFSimplificado = IRRFService.calcular(
      baseIR,
      valorINSS,
      parseInt(dependentes) || 0,
      parseFloat(pensaoAlimenticia) || 0,
      true, // usa dedução simplificada
      ano
    );
    const valorIRRFSimplificado = calculoIRRFSimplificado.valorIRRF;

    memoria.push({
      passo: venderUmTerco ? 9 : 8,
      descricao: `IRRF - Desconto Simplificado: Calculado com dedução simplificada`,
      calculo: `Base: R$ ${baseIR.toFixed(2)} | Dedução Simplificada: R$ 607,20`,
      valor: valorIRRFSimplificado.toFixed(2)
    });

    // Total líquido = Valor férias + Adicional 1/3 + Abono - INSS - IRRF
    const totalLiquido = baseCalculoImpostos + abonoPecuniario - valorINSS - valorIRRF;

    memoria.push({
      passo: venderUmTerco ? 10 : 9,
      descricao: `Total: R$ ${baseCalculoImpostos.toFixed(2)} + R$ ${abonoPecuniario.toFixed(2)} - R$ ${valorINSS.toFixed(2)} - R$ ${valorIRRF.toFixed(2)}`,
      calculo: `R$ ${(baseCalculoImpostos + abonoPecuniario).toFixed(2)} - R$ ${valorINSS.toFixed(2)} - R$ ${valorIRRF.toFixed(2)} = R$ ${totalLiquido.toFixed(2)}`,
      valor: totalLiquido.toFixed(2),
      destaque: true
    });

    return {
      periodoAquisitivo: {
        inicio: periodoAquisitivoInicio,
        fim: periodoAquisitivoFim
      },
      dataConcessao: dataConcessaoInicio,
      periodoConcessao: {
        inicio: dataConcessaoInicio,
        fim: dataConcessaoFim
      },
      salario: salarioNum,
      diasFerias,
      valorFerias: parseFloat(valorFerias.toFixed(2)),
      adicionalUmTerco: parseFloat(adicionalUmTerco.toFixed(2)),
      abonoPecuniario: parseFloat(abonoPecuniario.toFixed(2)),
      valorINSS: parseFloat(valorINSS.toFixed(2)),
      valorIRRF: parseFloat(valorIRRF.toFixed(2)),
      valorIRRFSimplificado: parseFloat(valorIRRFSimplificado.toFixed(2)),
      total: parseFloat(totalLiquido.toFixed(2)),
      memoria,
      baseLegal: {
        titulo: "Consolidação das Leis do Trabalho - CLT",
        artigo: "Art. 130, Art. 134 e Art. 64",
        descricao: "Cálculo de férias conforme CLT, incluindo adicional de 1/3, abono pecuniário (se aplicável) e descontos de INSS e IRRF."
      }
    };
  }
}

module.exports = FeriasService;
