/**
 * SERVICE: PericulosidadeService
 * Cálculo de adicionais de periculosidade e insalubridade
 * 
 * BASE LEGAL: CLT - Art. 193 (Periculosidade) e Art. 189 (Insalubridade)
 * 
 * REGRA CRÍTICA: Ambos os cálculos são feitos sobre o SALÁRIO MÍNIMO, não sobre o salário do funcionário
 */

class PericulosidadeService {
  // Salários mínimos por ano (conforme legislação brasileira)
  static SALARIOS_MINIMOS = {
    2024: 1412.00,
    2025: 1518.00,  // Valor oficial para 2025
    2026: 1621.00   // Projeção estimada para 2026
  };

  /**
   * Obtém o salário mínimo do ano
   * @param {number} ano - Ano (2024, 2025 ou 2026)
   * @returns {number} Salário mínimo do ano
   */
  static getSalarioMinimo(ano = null) {
    if (!ano) {
      ano = new Date().getFullYear();
    }
    
    if (!this.SALARIOS_MINIMOS[ano]) {
      // Se o ano não estiver na lista, usa o mais recente disponível
      const anosDisponiveis = Object.keys(this.SALARIOS_MINIMOS).map(Number).sort((a, b) => b - a);
      ano = anosDisponiveis[0];
    }
    
    return this.SALARIOS_MINIMOS[ano];
  }

  /**
   * Calcula adicional de periculosidade
   * CORREÇÃO: Calcula sobre o SALÁRIO MÍNIMO, não sobre o salário do funcionário
   * @param {number} ano - Ano para usar o salário mínimo correto (2024, 2025 ou 2026)
   * @returns {Object}
   */
  static calcularPericulosidade(ano = null) {
    // Valida se o ano foi informado
    if (!ano) {
      throw new Error('Ano é obrigatório para calcular periculosidade. Informe 2024, 2025 ou 2026.');
    }

    const salarioMinimo = this.getSalarioMinimo(ano);
    const percentual = 30; // 30% conforme CLT Art. 193
    const valorAdicional = (salarioMinimo * percentual) / 100;

    const memoria = [
      {
        passo: 1,
        descricao: `Salário Mínimo ${ano}: R$ ${salarioMinimo.toFixed(2)}`,
        valor: salarioMinimo.toFixed(2),
        observacao: 'Base de cálculo para periculosidade é sempre o salário mínimo'
      },
      {
        passo: 2,
        descricao: `Percentual de Periculosidade: ${percentual}%`,
        valor: `${percentual}%`,
        observacao: 'Conforme CLT Art. 193'
      },
      {
        passo: 3,
        descricao: `Cálculo do Adicional: R$ ${salarioMinimo.toFixed(2)} × ${percentual}%`,
        calculo: `R$ ${salarioMinimo.toFixed(2)} × ${percentual}% = R$ ${valorAdicional.toFixed(2)}`,
        valor: valorAdicional.toFixed(2),
        destaque: true
      }
    ];

    return {
      tipo: 'periculosidade',
      ano,
      salarioMinimo: parseFloat(salarioMinimo.toFixed(2)),
      percentual,
      valorAdicional: parseFloat(valorAdicional.toFixed(2)),
      memoria,
      baseLegal: {
        titulo: 'CLT - Art. 193',
        artigo: 'Art. 193',
        descricao: 'São consideradas atividades ou operações perigosas aquelas que, por sua natureza ou métodos de trabalho, impliquem risco acentuado em virtude de exposição permanente a inflamáveis, explosivos ou energia elétrica. O adicional é de 30% sobre o salário mínimo.'
      }
    };
  }

  /**
   * Calcula adicional de insalubridade
   * CORREÇÃO: Calcula sobre o SALÁRIO MÍNIMO, não sobre o salário do funcionário
   * @param {string} grau - 'minimo', 'medio', 'maximo'
   * @param {number} ano - Ano para usar o salário mínimo correto (2024, 2025 ou 2026)
   * @returns {Object}
   */
  static calcularInsalubridade(grau = 'medio', ano = null) {
    // Valida se o ano foi informado
    if (!ano) {
      throw new Error('Ano é obrigatório para calcular insalubridade. Informe 2024, 2025 ou 2026.');
    }

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

    const salarioMinimo = this.getSalarioMinimo(ano);
    const valorAdicional = (salarioMinimo * config.percentual) / 100;

    const memoria = [
      {
        passo: 1,
        descricao: `Salário Mínimo ${ano} (Base de Cálculo): R$ ${salarioMinimo.toFixed(2)}`,
        valor: salarioMinimo.toFixed(2),
        observacao: 'Base de cálculo para insalubridade é sempre o salário mínimo'
      },
      {
        passo: 2,
        descricao: `Grau de Insalubridade: ${config.nome} (${config.percentual}%)`,
        valor: `${config.percentual}%`,
        observacao: config.descricao
      },
      {
        passo: 3,
        descricao: `Cálculo do Adicional: R$ ${salarioMinimo.toFixed(2)} × ${config.percentual}%`,
        calculo: `R$ ${salarioMinimo.toFixed(2)} × ${config.percentual}% = R$ ${valorAdicional.toFixed(2)}`,
        valor: valorAdicional.toFixed(2),
        destaque: true
      }
    ];

    return {
      tipo: 'insalubridade',
      ano,
      grau: config.nome,
      percentual: config.percentual,
      salarioMinimo: parseFloat(salarioMinimo.toFixed(2)),
      valorAdicional: parseFloat(valorAdicional.toFixed(2)),
      memoria,
      baseLegal: {
        titulo: 'CLT - Art. 189',
        artigo: 'Art. 189',
        descricao: 'São consideradas atividades ou operações insalubres aquelas que exponham os empregados a agentes nocivos à saúde. O adicional varia conforme o grau: mínimo (10%), médio (20%) ou máximo (40%) sobre o salário mínimo.'
      }
    };
  }
}

module.exports = PericulosidadeService;

