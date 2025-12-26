/**
 * SERVICE: PericulosidadeService
 * Cálculo de adicionais de periculosidade e insalubridade
 * 
 * BASE LEGAL: CLT - Art. 193 (Periculosidade) e Art. 189 (Insalubridade)
 */

class PericulosidadeService {
  // Valores atualizados (ajustar conforme salário mínimo)
  static SALARIO_MINIMO_2024 = 1412.00;

  /**
   * Calcula adicional de periculosidade
   * @param {number} salarioBase 
   * @returns {Object}
   */
  static calcularPericulosidade(salarioBase) {
    const percentual = 30;
    const valorAdicional = (salarioBase * percentual) / 100;
    const salarioTotal = salarioBase + valorAdicional;

    const memoria = [
      {
        passo: 1,
        descricao: `Salário Base: R$ ${salarioBase.toFixed(2)}`,
        valor: salarioBase.toFixed(2)
      },
      {
        passo: 2,
        descricao: `Percentual de Periculosidade: ${percentual}%`,
        valor: `${percentual}%`
      },
      {
        passo: 3,
        descricao: `Cálculo do Adicional: R$ ${salarioBase.toFixed(2)} × ${percentual}%`,
        calculo: `R$ ${salarioBase.toFixed(2)} × ${percentual}% = R$ ${valorAdicional.toFixed(2)}`,
        valor: valorAdicional.toFixed(2)
      },
      {
        passo: 4,
        descricao: `Salário Total: R$ ${salarioTotal.toFixed(2)}`,
        calculo: `R$ ${salarioBase.toFixed(2)} + R$ ${valorAdicional.toFixed(2)} = R$ ${salarioTotal.toFixed(2)}`,
        valor: salarioTotal.toFixed(2),
        destaque: true
      }
    ];

    return {
      tipo: 'periculosidade',
      salarioBase,
      percentual,
      valorAdicional: parseFloat(valorAdicional.toFixed(2)),
      salarioTotal: parseFloat(salarioTotal.toFixed(2)),
      memoria,
      educacao: {
        titulo: 'Periculosidade vs Insalubridade',
        descricao: 'Periculosidade: risco à vida (30% sobre salário base). Insalubridade: risco à saúde (percentual sobre salário mínimo).',
        comparacao: 'Periculosidade é calculada sobre o salário base, enquanto insalubridade é calculada sobre o salário mínimo.'
      },
      baseLegal: {
        titulo: 'CLT - Art. 193',
        artigo: 'Art. 193',
        descricao: 'São consideradas atividades ou operações perigosas aquelas que, por sua natureza ou métodos de trabalho, impliquem risco acentuado em virtude de exposição permanente a inflamáveis, explosivos ou energia elétrica. O adicional é de 30% sobre o salário base.'
      }
    };
  }

  /**
   * Calcula adicional de insalubridade
   * @param {string} grau - 'minimo', 'medio', 'maximo'
   * @returns {Object}
   */
  static calcularInsalubridade(grau = 'medio') {
    const graus = {
      minimo: {
        nome: 'Mínimo',
        percentual: 10,
        descricao: 'Risco leve à saúde'
      },
      medio: {
        nome: 'Médio',
        percentual: 20,
        descricao: 'Risco moderado à saúde'
      },
      maximo: {
        nome: 'Máximo',
        percentual: 40,
        descricao: 'Risco grave à saúde'
      }
    };

    const config = graus[grau];
    if (!config) {
      throw new Error('Grau de insalubridade inválido');
    }

    const baseCalculo = this.SALARIO_MINIMO_2024;
    const valorAdicional = (baseCalculo * config.percentual) / 100;

    const memoria = [
      {
        passo: 1,
        descricao: `Salário Mínimo (Base de Cálculo): R$ ${baseCalculo.toFixed(2)}`,
        valor: baseCalculo.toFixed(2)
      },
      {
        passo: 2,
        descricao: `Grau de Insalubridade: ${config.nome} (${config.percentual}%)`,
        valor: `${config.percentual}%`
      },
      {
        passo: 3,
        descricao: `Cálculo do Adicional: R$ ${baseCalculo.toFixed(2)} × ${config.percentual}%`,
        calculo: `R$ ${baseCalculo.toFixed(2)} × ${config.percentual}% = R$ ${valorAdicional.toFixed(2)}`,
        valor: valorAdicional.toFixed(2),
        destaque: true
      }
    ];

    return {
      tipo: 'insalubridade',
      grau: config.nome,
      percentual: config.percentual,
      baseCalculo: parseFloat(baseCalculo.toFixed(2)),
      valorAdicional: parseFloat(valorAdicional.toFixed(2)),
      memoria,
      educacao: {
        titulo: 'Insalubridade: Base de Cálculo',
        descricao: 'Diferente da periculosidade, a insalubridade é calculada sobre o salário mínimo, não sobre o salário base do funcionário.',
        observacao: 'O grau de insalubridade é determinado por laudo técnico de periculosidade e insalubridade (LTCAT).'
      },
      baseLegal: {
        titulo: 'CLT - Art. 189',
        artigo: 'Art. 189',
        descricao: 'São consideradas atividades ou operações insalubres aquelas que exponham os empregados a agentes nocivos à saúde. O adicional varia conforme o grau: mínimo (10%), médio (20%) ou máximo (40%) sobre o salário mínimo.'
      }
    };
  }
}

module.exports = PericulosidadeService;

