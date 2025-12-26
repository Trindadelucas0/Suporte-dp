/**
 * SERVICE: CustoService
 * Simulador de custo total do funcionário
 * Agrega todos os custos trabalhistas
 */

const INSSService = require('./inssService');
const FGTSService = require('./fgtsService');
const AvosService = require('./avosService');

class CustoService {
  /**
   * Calcula custo total do funcionário
   * @param {Object} dados 
   * @returns {Object}
   */
  static calcular(dados) {
    const {
      salarioBruto,
      tipoRegistro = 'clt_geral',
      proLabore = false,
      beneficios = 0,
      encargosAdicionais = 0
    } = dados;

    const memoria = [];
    let custoMensal = 0;
    let custoAnual = 0;

    // 1. Salário Bruto
    memoria.push({
      passo: 1,
      descricao: 'Salário Bruto',
      valor: salarioBruto.toFixed(2),
      tipo: 'base'
    });
    custoMensal += salarioBruto;

    // 2. Férias (1/12 + 1/3)
    const valorFeriasMensal = (salarioBruto / 12) + ((salarioBruto / 12) / 3);
    memoria.push({
      passo: 2,
      descricao: 'Férias Proporcionais (1/12 + 1/3)',
      calculo: `(R$ ${salarioBruto.toFixed(2)} ÷ 12) + ((R$ ${salarioBruto.toFixed(2)} ÷ 12) ÷ 3)`,
      valor: valorFeriasMensal.toFixed(2),
      tipo: 'encargo'
    });
    custoMensal += valorFeriasMensal;

    // 3. 13º Salário (1/12)
    const valorDecimoTerceiroMensal = salarioBruto / 12;
    memoria.push({
      passo: 3,
      descricao: '13º Salário Proporcional (1/12)',
      calculo: `R$ ${salarioBruto.toFixed(2)} ÷ 12`,
      valor: valorDecimoTerceiroMensal.toFixed(2),
      tipo: 'encargo'
    });
    custoMensal += valorDecimoTerceiroMensal;

    // 4. FGTS
    const calculoFGTS = FGTSService.calcular(salarioBruto, tipoRegistro);
    const valorFGTSService = calculoFGTS.valorTotal;
    memoria.push({
      passo: 4,
      descricao: `FGTS (${calculoFGTS.percentualFGTS}%${calculoFGTS.percentualAdicional > 0 ? ' + ' + calculoFGTS.percentualAdicional + '%' : ''})`,
      calculo: `R$ ${salarioBruto.toFixed(2)} × ${calculoFGTS.percentualFGTS}%${calculoFGTS.percentualAdicional > 0 ? ' + R$ ' + salarioBruto.toFixed(2) + ' × ' + calculoFGTS.percentualAdicional + '%' : ''}`,
      valor: valorFGTSService.toFixed(2),
      tipo: 'encargo'
    });
    custoMensal += valorFGTSService;

    // 5. Encargos Previdenciários (INSS patronal - se aplicável)
    // Nota: INSS do funcionário já está descontado do salário bruto
    // Aqui consideramos apenas encargos adicionais se houver
    if (encargosAdicionais > 0) {
      memoria.push({
        passo: 5,
        descricao: 'Encargos Previdenciários Adicionais',
        valor: encargosAdicionais.toFixed(2),
        tipo: 'encargo'
      });
      custoMensal += encargosAdicionais;
    }

    // 6. Benefícios
    if (beneficios > 0) {
      memoria.push({
        passo: 6,
        descricao: 'Benefícios (VT, VR, Plano de Saúde, etc.)',
        valor: beneficios.toFixed(2),
        tipo: 'beneficio'
      });
      custoMensal += beneficios;
    }

    // Total Mensal
    memoria.push({
      passo: memoria.length + 1,
      descricao: 'CUSTO MENSAL TOTAL',
      calculo: memoria.filter(m => m.tipo).map(m => `R$ ${m.valor}`).join(' + '),
      valor: custoMensal.toFixed(2),
      tipo: 'total',
      destaque: true
    });

    // Custo Anual
    custoAnual = custoMensal * 12;
    memoria.push({
      passo: memoria.length + 1,
      descricao: 'CUSTO ANUAL TOTAL',
      calculo: `R$ ${custoMensal.toFixed(2)} × 12 meses`,
      valor: custoAnual.toFixed(2),
      tipo: 'total',
      destaque: true
    });

    // Percentuais
    const percentualFerias = ((valorFeriasMensal / custoMensal) * 100).toFixed(2);
    const percentualDecimo = ((valorDecimoTerceiroMensal / custoMensal) * 100).toFixed(2);
    const percentualFGTS = ((valorFGTSService / custoMensal) * 100).toFixed(2);
    const percentualBeneficios = beneficios > 0 ? ((beneficios / custoMensal) * 100).toFixed(2) : 0;

    return {
      salarioBruto: parseFloat(salarioBruto.toFixed(2)),
      tipoRegistro,
      valorFeriasMensal: parseFloat(valorFeriasMensal.toFixed(2)),
      valorDecimoTerceiroMensal: parseFloat(valorDecimoTerceiroMensal.toFixed(2)),
      valorFGTS: parseFloat(valorFGTSService.toFixed(2)),
      encargosAdicionais: parseFloat(encargosAdicionais.toFixed(2)),
      beneficios: parseFloat(beneficios.toFixed(2)),
      custoMensal: parseFloat(custoMensal.toFixed(2)),
      custoAnual: parseFloat(custoAnual.toFixed(2)),
      percentuais: {
        ferias: parseFloat(percentualFerias),
        decimoTerceiro: parseFloat(percentualDecimo),
        fgts: parseFloat(percentualFGTS),
        beneficios: parseFloat(percentualBeneficios)
      },
      memoria,
      baseLegal: {
        titulo: 'CLT e Legislação Trabalhista',
        descricao: 'Custo total do funcionário inclui salário bruto, encargos sociais (FGTS, férias, 13º) e benefícios. Esses valores devem ser considerados no planejamento financeiro da empresa.'
      }
    };
  }
}

module.exports = CustoService;

