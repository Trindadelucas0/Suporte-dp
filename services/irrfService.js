/**
 * SERVICE: IRRFService
 * Cálculo de Imposto de Renda Retido na Fonte
 * 
 * BASE LEGAL: Lei nº 7.713/1988 - Art. 7º, inciso I
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
  static getTabela(ano = null, mes = null) {
    if (!ano) {
      ano = new Date().getFullYear();
    }
    if (!mes) {
      mes = new Date().getMonth() + 1;
    }
    
    // Verifica se há tabela específica para maio/2025 em diante
    if (ano === 2025 && mes >= 5 && this.TABELAS[2025] && this.TABELAS[2025].dataVigencia) {
      return this.TABELAS[2025];
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
   * @param {boolean} deducaoSimplificada - Usa dedução simplificada (20% do salário, limitado a R$ 16.754,34 em 2024)
   * @param {number} ano - Ano da tabela (opcional)
   * @param {number} mes - Mês para verificar vigência (opcional)
   * @returns {Object}
   */
  static calcular(salarioBruto, valorINSS, dependentes = 0, pensaoAlimenticia = 0, deducaoSimplificada = false, ano = null, mes = null) {
    const tabela = this.getTabela(ano, mes);
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
      descricao: `Tabela de IRRF ${anoUsado}`,
      valor: `Ano ${anoUsado}`
    });

    let valorDependentes = 0;
    let valorDeducaoSimplificada = 0;
    let baseCalculo;
    let calculoBase = '';

    // CORREÇÃO CRÍTICA: Dedução Simplificada substitui TUDO (INSS, dependentes, pensão)
    // Lei 15.191/2025 e MP 1.294/2025: Valor fixo de R$ 607,20 mensal
    if (deducaoSimplificada) {
      // Valor fixo conforme Lei 15.191/2025 e MP 1.294/2025
      valorDeducaoSimplificada = 607.20;
      
      memoria.push({
        passo: 3,
        descricao: `(-) Dedução Simplificada: R$ 607,20 (fixo)`,
        calculo: `Valor fixo mensal conforme Lei 15.191/2025 e MP 1.294/2025`,
        valor: `-${valorDeducaoSimplificada.toFixed(2)}`,
        observacao: 'Lei 15.191/2025 e MP 1.294/2025 - Dedução simplificada substitui TODAS as deduções legais (INSS, dependentes, pensão)'
      });

      // IMPORTANTE: Com dedução simplificada, NÃO deduz INSS, dependentes nem pensão
      // A dedução simplificada substitui tudo
      baseCalculo = salarioBruto - valorDeducaoSimplificada;
      calculoBase = `R$ ${salarioBruto.toFixed(2)} - R$ ${valorDeducaoSimplificada.toFixed(2)} = R$ ${baseCalculo.toFixed(2)}`;
    } else {
      // Dedução normal: INSS + dependentes + pensão
      memoria.push({
        passo: 3,
        descricao: `(-) INSS: R$ ${valorINSS.toFixed(2)}`,
        valor: `-${valorINSS.toFixed(2)}`
      });

      // Dedução por dependentes
      valorDependentes = dependentes * VALOR_DEPENDENTE;
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

      baseCalculo = salarioBruto - valorINSS - valorDependentes - pensaoAlimenticia;
      calculoBase = `R$ ${salarioBruto.toFixed(2)} - R$ ${valorINSS.toFixed(2)} - R$ ${valorDependentes.toFixed(2)} - R$ ${pensaoAlimenticia.toFixed(2)} = R$ ${baseCalculo.toFixed(2)}`;
    }

    memoria.push({
      passo: memoria.length + 1,
      descricao: `Base de Cálculo do IR: R$ ${baseCalculo.toFixed(2)}`,
      calculo: calculoBase,
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
          titulo: 'Lei nº 7.713, de 22 de dezembro de 1988',
          artigo: 'Art. 7º, inciso I',
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

    // Calcula IRRF pela tabela progressiva
    let valorIRRF = (baseCalculo * faixaAplicavel.aliquota / 100) - faixaAplicavel.deducao;
    valorIRRF = Math.max(0, valorIRRF); // Garante que não seja negativo

    memoria.push({
      passo: memoria.length + 1,
      descricao: `Alíquota aplicável: ${faixaAplicavel.aliquota}%`,
      valor: `${faixaAplicavel.aliquota}%`
    });

    memoria.push({
      passo: memoria.length + 1,
      descricao: `Cálculo pela tabela: (R$ ${baseCalculo.toFixed(2)} × ${faixaAplicavel.aliquota}%) - R$ ${faixaAplicavel.deducao.toFixed(2)}`,
      calculo: `R$ ${(baseCalculo * faixaAplicavel.aliquota / 100).toFixed(2)} - R$ ${faixaAplicavel.deducao.toFixed(2)} = R$ ${valorIRRF.toFixed(2)}`,
      valor: valorIRRF.toFixed(2)
    });

    // NOVA REGRA DE ISENÇÃO (a partir de 2026)
    // Aplicar desconto progressivo APÓS calcular pela tabela
    if (anoUsado >= 2026 && valorIRRF > 0) {
      let descontoPercentual = 0;
      let valorDesconto = 0;
      let valorIRRFFinal = valorIRRF;

      // Regra: desconto progressivo entre R$ 5.000 e R$ 7.000
      if (baseCalculo <= 5000) {
        // Até R$ 5.000,00 → IR = R$ 0,00 (100% de desconto)
        descontoPercentual = 100;
        valorDesconto = valorIRRF;
        valorIRRFFinal = 0;
      } else if (baseCalculo >= 7000) {
        // Acima de R$ 7.000,00 → sem desconto (cálculo normal)
        descontoPercentual = 0;
        valorDesconto = 0;
        valorIRRFFinal = valorIRRF;
      } else {
        // Entre R$ 5.000 e R$ 7.000 → desconto progressivo
        // Fórmula: desconto = 100% - ((baseCalculo - 5000) / 2000) * 100%
        // Exemplos:
        // R$ 5.500 → desconto = 100% - (500/2000)*100% = 100% - 25% = 75%
        // R$ 6.000 → desconto = 100% - (1000/2000)*100% = 100% - 50% = 50%
        // R$ 6.500 → desconto = 100% - (1500/2000)*100% = 100% - 75% = 25%
        descontoPercentual = 100 - ((baseCalculo - 5000) / 2000) * 100;
        valorDesconto = (valorIRRF * descontoPercentual) / 100;
        valorIRRFFinal = valorIRRF - valorDesconto;
      }

      if (descontoPercentual > 0) {
        memoria.push({
          passo: memoria.length + 1,
          descricao: `Nova Regra de Isenção 2026: Base de cálculo entre R$ 5.000 e R$ 7.000`,
          valor: `Desconto de ${descontoPercentual.toFixed(1)}%`
        });

        memoria.push({
          passo: memoria.length + 1,
          descricao: `(-) Desconto por isenção: R$ ${valorDesconto.toFixed(2)} (${descontoPercentual.toFixed(1)}%)`,
          calculo: `R$ ${valorIRRF.toFixed(2)} × ${descontoPercentual.toFixed(1)}% = R$ ${valorDesconto.toFixed(2)}`,
          valor: `-${valorDesconto.toFixed(2)}`
        });

        valorIRRF = valorIRRFFinal;
      }
    }

    memoria.push({
      passo: memoria.length + 1,
      descricao: `IRRF Final: R$ ${valorIRRF.toFixed(2)}`,
      valor: valorIRRF.toFixed(2),
      destaque: true
    });

    return {
      salarioBruto,
      valorINSS,
      dependentes,
      pensaoAlimenticia,
      deducaoSimplificada,
      valorDeducaoSimplificada: parseFloat(valorDeducaoSimplificada.toFixed(2)),
      baseCalculo: parseFloat(baseCalculo.toFixed(2)),
      aliquota: faixaAplicavel.aliquota,
      valorIRRF: parseFloat(Math.max(0, valorIRRF).toFixed(2)),
      ano: anoUsado,
      faixas: FAIXAS,
      valorDependente: VALOR_DEPENDENTE,
      memoria,
      baseLegal: {
        titulo: deducaoSimplificada 
          ? 'Lei nº 13.670/2018 e Lei nº 7.713/1988'
          : 'Lei nº 7.713, de 22 de dezembro de 1988',
        artigo: deducaoSimplificada 
          ? 'Lei 13.670/2018 - Art. 1º e Lei 7.713/1988 - Art. 7º, inciso I'
          : 'Art. 7º, inciso I',
        descricao: (() => {
          let desc = deducaoSimplificada
            ? `Dedução simplificada: Valor fixo mensal de R$ 607,20 (Lei 15.191/2025 e MP 1.294/2025). Substitui todas as deduções legais (INSS, dependentes, pensão). Aplica-se exclusivamente ao IRRF mensal.`
            : `Tabela progressiva do Imposto de Renda Retido na Fonte ${anoUsado}, com dedução por dependente de R$ ${VALOR_DEPENDENTE.toFixed(2)}.`;
          
          // Adiciona informação sobre nova regra de isenção 2026
          if (anoUsado >= 2026) {
            desc += ` A partir de 2026, aplica-se ampliação da isenção: base de cálculo até R$ 5.000,00 é totalmente isenta; entre R$ 5.000,00 e R$ 7.000,00 há desconto progressivo; acima de R$ 7.000,00 aplica-se cálculo normal pela tabela progressiva. Esta regra aplica-se APENAS ao IRRF mensal (folha de pagamento), não se confunde com tributação mínima anual.`;
          }
          
          return desc;
        })()
      }
    };
  }
}

module.exports = IRRFService;

