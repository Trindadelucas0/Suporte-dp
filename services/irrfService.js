/**
 * SERVICE: IRRFService
 * Cálculo de Imposto de Renda Retido na Fonte
 * 
 * BASE LEGAL: Instrução Normativa RFB nº 1500/2014
 */

const fs = require('fs');
const path = require('path');

class IRRFService {
  // Carrega tabelas históricas do arquivo JSON
  static TABELAS = (() => {
    try {
      const tabelasPath = path.join(__dirname, '..', 'data', 'tabelas-irrf-historico.json');
      const tabelasJson = fs.readFileSync(tabelasPath, 'utf8');
      return JSON.parse(tabelasJson);
    } catch (error) {
      console.warn('Erro ao carregar tabelas IRRF, usando tabela padrão:', error.message);
      return {
        2024: {
          faixas: [
            { limite: 1903.98, aliquota: 0, deducao: 0 },
            { limite: 2826.65, aliquota: 7.5, deducao: 142.80 },
            { limite: 3751.05, aliquota: 15.0, deducao: 354.80 },
            { limite: 4664.68, aliquota: 22.5, deducao: 636.13 },
            { limite: Infinity, aliquota: 27.5, deducao: 869.36 }
          ],
          valorDependente: 189.59
        }
      };
    }
  })();

  /**
   * Obtém a tabela do ano
   */
  static getTabela(ano = null) {
    if (!ano) {
      ano = new Date().getFullYear();
    }
    
    if (!this.TABELAS[ano]) {
      const anosDisponiveis = Object.keys(this.TABELAS).map(Number).sort((a, b) => b - a);
      ano = anosDisponiveis[0];
    }
    
    return this.TABELAS[ano];
  }

  /**
   * Calcula IRRF
   * @param {number} salarioBruto 
   * @param {number} valorINSS 
   * @param {number} dependentes 
   * @param {number} pensaoAlimenticia 
   * @param {number} ano - Ano da tabela (opcional)
   * @returns {Object}
   */
  static calcular(salarioBruto, valorINSS, dependentes = 0, pensaoAlimenticia = 0, ano = null) {
    const tabela = this.getTabela(ano);
    const FAIXAS = tabela.faixas;
    const VALOR_DEPENDENTE = tabela.valorDependente;
    const anoUsado = ano || new Date().getFullYear();
    const memoria = [];

    memoria.push({
      passo: 1,
      descricao: `Salário Bruto: R$ ${salarioBruto.toFixed(2)}`,
      valor: salarioBruto.toFixed(2)
    });

    memoria.push({
      passo: 2,
      descricao: `(-) INSS: R$ ${valorINSS.toFixed(2)}`,
      valor: `-${valorINSS.toFixed(2)}`
    });

    memoria.push({
      passo: 3,
      descricao: `Tabela de IRRF ${anoUsado}`,
      valor: `Ano ${anoUsado}`
    });

    // Dedução de dependentes
    const valorDependentes = dependentes * VALOR_DEPENDENTE;
    if (dependentes > 0) {
      memoria.push({
        passo: 4,
        descricao: `(-) Dependentes (${dependentes} × R$ ${VALOR_DEPENDENTE.toFixed(2)}): R$ ${valorDependentes.toFixed(2)}`,
        calculo: `${dependentes} × R$ ${VALOR_DEPENDENTE.toFixed(2)} = R$ ${valorDependentes.toFixed(2)}`,
        valor: `-${valorDependentes.toFixed(2)}`
      });
    }

    // Dedução de pensão alimentícia
    if (pensaoAlimenticia > 0) {
      memoria.push({
        passo: memoria.length + 1,
        descricao: `(-) Pensão Alimentícia: R$ ${pensaoAlimenticia.toFixed(2)}`,
        valor: `-${pensaoAlimenticia.toFixed(2)}`
      });
    }

    // Base de cálculo
    const baseCalculo = salarioBruto - valorINSS - valorDependentes - pensaoAlimenticia;

    memoria.push({
      passo: memoria.length + 1,
      descricao: `Base de Cálculo do IR: R$ ${baseCalculo.toFixed(2)}`,
      calculo: `R$ ${salarioBruto.toFixed(2)} - R$ ${valorINSS.toFixed(2)} - R$ ${valorDependentes.toFixed(2)} - R$ ${pensaoAlimenticia.toFixed(2)} = R$ ${baseCalculo.toFixed(2)}`,
      valor: baseCalculo.toFixed(2),
      destaque: true
    });

    // Se base for negativa ou zero, não há imposto
    if (baseCalculo <= 0) {
      memoria.push({
        passo: memoria.length + 1,
        descricao: 'Base de cálculo ≤ 0: Isento de IRRF',
        valor: '0.00'
      });

      return {
        salarioBruto,
        valorINSS,
        dependentes,
        pensaoAlimenticia,
        baseCalculo: 0,
        aliquota: 0,
        valorIRRF: 0,
        ano: anoUsado,
        memoria,
        baseLegal: {
          titulo: 'Instrução Normativa RFB nº 1500/2014',
          artigo: 'Art. 1º',
          descricao: 'Isento de IRRF quando a base de cálculo for igual ou inferior a zero.'
        }
      };
    }

    // Encontra a faixa
    let faixaAplicavel = null;
    for (const faixa of FAIXAS) {
      if (baseCalculo <= faixa.limite) {
        faixaAplicavel = faixa;
        break;
      }
    }

    if (!faixaAplicavel) {
      faixaAplicavel = FAIXAS[FAIXAS.length - 1];
    }

    // Calcula IRRF
    const valorIRRF = (baseCalculo * faixaAplicavel.aliquota / 100) - faixaAplicavel.deducao;

    memoria.push({
      passo: memoria.length + 1,
      descricao: `Alíquota aplicável: ${faixaAplicavel.aliquota}%`,
      valor: `${faixaAplicavel.aliquota}%`
    });

    memoria.push({
      passo: memoria.length + 1,
      descricao: `Cálculo: (R$ ${baseCalculo.toFixed(2)} × ${faixaAplicavel.aliquota}%) - R$ ${faixaAplicavel.deducao.toFixed(2)}`,
      calculo: `R$ ${(baseCalculo * faixaAplicavel.aliquota / 100).toFixed(2)} - R$ ${faixaAplicavel.deducao.toFixed(2)} = R$ ${Math.max(0, valorIRRF).toFixed(2)}`,
      valor: Math.max(0, valorIRRF).toFixed(2),
      destaque: true
    });

    return {
      salarioBruto,
      valorINSS,
      dependentes,
      pensaoAlimenticia,
      baseCalculo: parseFloat(baseCalculo.toFixed(2)),
      aliquota: faixaAplicavel.aliquota,
      valorIRRF: parseFloat(Math.max(0, valorIRRF).toFixed(2)),
      ano: anoUsado,
      faixas: FAIXAS,
      valorDependente: VALOR_DEPENDENTE,
      memoria,
      baseLegal: {
        titulo: 'Instrução Normativa RFB nº 1500/2014',
        artigo: 'Art. 1º e Anexo I',
        descricao: `Tabela progressiva do Imposto de Renda Retido na Fonte ${anoUsado}, com dedução por dependente de R$ ${VALOR_DEPENDENTE.toFixed(2)}.`
      }
    };
  }
}

module.exports = IRRFService;

