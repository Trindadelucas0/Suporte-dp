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
      encargosAdicionais = 0,
      regimeTributario = 'simples_nacional' // simples_nacional, lucro_presumido, lucro_real
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

    // 5. Encargos Previdenciários (INSS patronal - 20% sobre folha)
    // INSS Patronal é calculado sobre a mesma base do INSS do funcionário, mas com alíquota de 20%
    const calculoINSS = INSSService.calcular(salarioBruto, proLabore);
    // Base de cálculo do INSS (pode ser limitada pelo teto)
    const baseINSS = Math.min(salarioBruto, calculoINSS.teto || 8157.41);
    const inssPatronal = baseINSS * 0.20; // 20% sobre a base
    
    memoria.push({
      passo: 5,
      descricao: 'INSS Patronal (20% sobre folha)',
      calculo: `Base INSS: R$ ${baseINSS.toFixed(2)} × 20% = R$ ${inssPatronal.toFixed(2)}`,
      valor: inssPatronal.toFixed(2),
      tipo: 'encargo'
    });
    custoMensal += inssPatronal;

    // 6. Impostos conforme Regime Tributário
    let impostosRegime = 0;
    let descricaoImpostos = '';
    
    if (regimeTributario === 'simples_nacional') {
      // Simples Nacional: alíquota variável conforme faixa de receita
      // Estimativa: 6% a 15% sobre folha (depende da receita bruta anual)
      // Usando média de 8% para cálculo estimado
      impostosRegime = salarioBruto * 0.08;
      descricaoImpostos = 'Simples Nacional (estimado 8% sobre folha - varia conforme receita)';
    } else if (regimeTributario === 'lucro_presumido') {
      // Lucro Presumido: PIS (0,65%), COFINS (3%), CSLL (1,08%), IRPJ (1,2%)
      // Total aproximado: 5,93% sobre folha
      impostosRegime = salarioBruto * 0.0593;
      descricaoImpostos = 'Lucro Presumido: PIS (0,65%) + COFINS (3%) + CSLL (1,08%) + IRPJ (1,2%) = 5,93%';
    } else if (regimeTributario === 'lucro_real') {
      // Lucro Real: PIS (1,65%), COFINS (7,6%), CSLL (9%), IRPJ (15% sobre lucro)
      // Estimativa: 10% sobre folha (varia conforme lucro)
      impostosRegime = salarioBruto * 0.10;
      descricaoImpostos = 'Lucro Real: PIS (1,65%) + COFINS (7,6%) + CSLL (9%) + IRPJ (varia) = estimado 10%';
    }

    if (impostosRegime > 0) {
      memoria.push({
        passo: 6,
        descricao: `Impostos - ${regimeTributario.replace('_', ' ').toUpperCase()}`,
        calculo: `${descricaoImpostos} sobre R$ ${salarioBruto.toFixed(2)}`,
        valor: impostosRegime.toFixed(2),
        tipo: 'imposto'
      });
      custoMensal += impostosRegime;
    }

    // 7. Encargos Adicionais (se houver)
    if (encargosAdicionais > 0) {
      memoria.push({
        passo: memoria.length + 1,
        descricao: 'Encargos Previdenciários Adicionais',
        valor: encargosAdicionais.toFixed(2),
        tipo: 'encargo'
      });
      custoMensal += encargosAdicionais;
    }

    // 8. Benefícios
    if (beneficios > 0) {
      memoria.push({
        passo: memoria.length + 1,
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
      regimeTributario,
      valorFeriasMensal: parseFloat(valorFeriasMensal.toFixed(2)),
      valorDecimoTerceiroMensal: parseFloat(valorDecimoTerceiroMensal.toFixed(2)),
      valorFGTS: parseFloat(valorFGTSService.toFixed(2)),
      inssPatronal: parseFloat(inssPatronal.toFixed(2)),
      impostosRegime: parseFloat(impostosRegime.toFixed(2)),
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
        descricao: 'Custo total do funcionário inclui salário bruto, encargos sociais (FGTS, férias, 13º, INSS patronal), impostos conforme regime tributário e benefícios. Esses valores devem ser considerados no planejamento financeiro da empresa.'
      }
    };
  }
}

module.exports = CustoService;

