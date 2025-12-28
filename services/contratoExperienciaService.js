/**
 * SERVICE: ContratoExperienciaService
 * Cálculo de MULTA de quebra de contrato de experiência
 * 
 * BASE LEGAL: CLT Art. 479 e Art. 480
 * 
 * IMPORTANTE: Este módulo calcula APENAS a multa de quebra, não verbas rescisórias
 * 
 * Art. 479 - Quebra pelo EMPREGADOR:
 * - Multa de 50% sobre o valor dos salários correspondentes ao período que faltava
 * 
 * Art. 480 - Quebra pelo EMPREGADO:
 * - Desconto máximo de 50% sobre o valor dos salários correspondentes ao período que faltava
 * - O desconto nunca pode ser maior que o valor calculado no Art. 479
 */

const moment = require('moment');

class ContratoExperienciaService {
  /**
   * Calcula MULTA de quebra de contrato de experiência
   * 
   * REGRA LEGAL:
   * - Art. 479: Quebra pelo empregador → multa de 50% sobre salários restantes
   * - Art. 480: Quebra pelo empregado → desconto máximo de 50% sobre salários restantes
   * 
   * @param {Date} dataInicio - Data de início do contrato
   * @param {Date} dataFimPrevisto - Data prevista de término do contrato
   * @param {Date} dataEncerramento - Data real de encerramento (quebra)
   * @param {number} salarioBase - Salário base do funcionário
   * @param {string} quemQuebrou - 'empregador' ou 'empregado'
   * @returns {Object} Resultado com valor da multa, base de cálculo, artigo aplicado
   */
  static calcular(dataInicio, dataFimPrevisto, dataEncerramento, salarioBase, quemQuebrou = 'empregador') {
    const inicio = moment(dataInicio);
    const fimPrevisto = moment(dataFimPrevisto);
    const encerramento = moment(dataEncerramento);
    
    const memoria = [];

    memoria.push({
      passo: 1,
      descricao: `Data de Início do Contrato: ${inicio.format('DD/MM/YYYY')}`,
      valor: inicio.format('DD/MM/YYYY')
    });

    memoria.push({
      passo: 2,
      descricao: `Data Prevista de Término: ${fimPrevisto.format('DD/MM/YYYY')}`,
      valor: fimPrevisto.format('DD/MM/YYYY')
    });

    memoria.push({
      passo: 3,
      descricao: `Data Real de Encerramento (Quebra): ${encerramento.format('DD/MM/YYYY')}`,
      valor: encerramento.format('DD/MM/YYYY')
    });

    // Determina quem quebrou o contrato baseado no parâmetro informado pelo usuário
    // O usuário informa explicitamente quem quebrou, mas validamos com as datas
    const quebradoPeloEmpregador = quemQuebrou === 'empregador';
    const quebradoPeloEmpregado = quemQuebrou === 'empregado';
    
    // Calcula quantos dias faltavam até o fim do contrato
    // IMPORTANTE: Só há dias restantes se o encerramento ocorreu ANTES da data prevista
    let diasRestantes = 0;
    if (encerramento.isBefore(fimPrevisto, 'day')) {
      // Se encerrou antes do previsto, calcula os dias que faltavam
      diasRestantes = fimPrevisto.diff(encerramento, 'days');
    } else {
      // Se encerrou na ou após a data prevista, não há dias restantes
      diasRestantes = 0;
    }

    memoria.push({
      passo: 4,
      descricao: `Análise da Quebra`,
      calculo: quebradoPeloEmpregador 
        ? `Quebra pelo EMPREGADOR (Art. 479) → Multa de 50% sobre salários restantes`
        : `Quebra pelo EMPREGADO (Art. 480) → Desconto máximo de 50% sobre salários restantes`,
      valor: quebradoPeloEmpregador ? 'Art. 479' : 'Art. 480'
    });

    memoria.push({
      passo: 5,
      descricao: `Dias Restantes do Contrato`,
      calculo: quebradoPeloEmpregador
        ? `De ${encerramento.format('DD/MM/YYYY')} até ${fimPrevisto.format('DD/MM/YYYY')} = ${diasRestantes} dias`
        : `Encerramento na ou após data prevista → 0 dias restantes`,
      valor: `${diasRestantes} dias`
    });

    // Base de cálculo: valor dos salários correspondentes aos dias restantes
    // Salário diário = salário base / 30
    const salarioDiario = salarioBase / 30;
    const valorSalariosRestantes = salarioDiario * diasRestantes;

    memoria.push({
      passo: 6,
      descricao: `Base de Cálculo: Valor dos Salários Restantes`,
      calculo: `Salário diário: R$ ${salarioBase.toFixed(2)} ÷ 30 = R$ ${salarioDiario.toFixed(2)}/dia`,
      valor: `R$ ${salarioDiario.toFixed(2)}/dia`
    });

    memoria.push({
      passo: 7,
      descricao: `Valor dos Salários Restantes`,
      calculo: `R$ ${salarioDiario.toFixed(2)} × ${diasRestantes} dias = R$ ${valorSalariosRestantes.toFixed(2)}`,
      valor: `R$ ${valorSalariosRestantes.toFixed(2)}`,
      destaque: true
    });

    // Calcula a multa conforme o artigo aplicável
    let valorMulta = 0;
    let artigoAplicado = '';
    let descricaoArtigo = '';

    if (quebradoPeloEmpregador) {
      // Art. 479 - Quebra pelo EMPREGADOR
      // Multa de 50% sobre o valor dos salários restantes
      valorMulta = valorSalariosRestantes * 0.50;
      artigoAplicado = 'Art. 479';
      descricaoArtigo = 'Quebra pelo Empregador: Multa de 50% sobre o valor dos salários correspondentes ao período que faltava para o término do contrato.';

      memoria.push({
        passo: 8,
        descricao: `Multa (Art. 479): 50% sobre salários restantes`,
        calculo: `R$ ${valorSalariosRestantes.toFixed(2)} × 50% = R$ ${valorMulta.toFixed(2)}`,
        valor: `R$ ${valorMulta.toFixed(2)}`,
        destaque: true
      });
    } else {
      // Art. 480 - Quebra pelo EMPREGADO
      // Desconto máximo de 50% sobre o valor dos salários restantes
      // IMPORTANTE: Se não há dias restantes (encerrou no ou após o previsto), não há multa
      if (diasRestantes > 0) {
        // Calcula o desconto de 50% sobre os salários restantes
        valorMulta = valorSalariosRestantes * 0.50;
        artigoAplicado = 'Art. 480';
        descricaoArtigo = 'Quebra pelo Empregado: Desconto máximo de 50% sobre o valor dos salários correspondentes ao período que faltava. O desconto nunca pode ser maior que o valor calculado no Art. 479.';

        memoria.push({
          passo: 8,
          descricao: `Desconto Máximo (Art. 480): 50% sobre salários restantes`,
          calculo: `R$ ${valorSalariosRestantes.toFixed(2)} × 50% = R$ ${valorMulta.toFixed(2)}`,
          valor: `R$ ${valorMulta.toFixed(2)} (máximo legal de desconto)`,
          destaque: true
        });
      } else {
        // Se encerrou na ou após a data prevista, não há dias restantes, portanto não há multa
        valorMulta = 0;
        artigoAplicado = 'Art. 480';
        descricaoArtigo = 'Quebra pelo Empregado: Como o encerramento ocorreu na ou após a data prevista, não há dias restantes e, portanto, não há multa a ser descontada do empregado.';

        memoria.push({
          passo: 8,
          descricao: `Sem Multa (Art. 480)`,
          calculo: `Encerramento na ou após data prevista → 0 dias restantes → Multa = R$ 0,00`,
          valor: `R$ 0,00`,
          destaque: true
        });
      }
    }

    return {
      dataInicio: inicio.format('YYYY-MM-DD'),
      dataFimPrevisto: fimPrevisto.format('YYYY-MM-DD'),
      dataEncerramento: encerramento.format('YYYY-MM-DD'),
      salarioBase: parseFloat(salarioBase.toFixed(2)),
      salarioDiario: parseFloat(salarioDiario.toFixed(2)),
      diasRestantes,
      valorSalariosRestantes: parseFloat(valorSalariosRestantes.toFixed(2)),
      quebradoPeloEmpregador,
      quebradoPeloEmpregado,
      artigoAplicado,
      valorMulta: parseFloat(valorMulta.toFixed(2)),
      memoria,
      baseLegal: {
        titulo: 'Consolidação das Leis do Trabalho - CLT',
        artigo: artigoAplicado,
        descricao: descricaoArtigo,
        textoCompleto: artigoAplicado === 'Art. 479' 
          ? 'Art. 479. Nos contratos que tenham termo estipulado, o empregador que, sem justa causa, despedir o empregado, ou este der motivo justo para rescisão, pagará, por metade, os salários do tempo de serviço que faltarem para a expiração do contrato.'
          : 'Art. 480. Nos contratos que tenham termo estipulado, o empregado que, sem justa causa, despedir-se, ou der motivo justo para rescisão, pagará, por metade, os salários do tempo de serviço que faltarem para a expiração do contrato, não podendo, porém, o desconto exceder a metade dos salários do tempo de serviço que faltarem.'
      }
    };
  }
}

module.exports = ContratoExperienciaService;
