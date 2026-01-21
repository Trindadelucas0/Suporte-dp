/**
 * SERVICE: INSSService
 * Cálculo de INSS progressivo conforme Lei nº 8.212/1991
 * 
 * BASE LEGAL: Lei nº 8.212, de 24 de julho de 1991 - Art. 28
 * Tabelas históricas de 2001 até 2026
 */

const fs = require('fs');
const path = require('path');

class INSSService {
  // Carrega tabelas históricas do arquivo JSON
  static TABELAS = (() => {
    try {
      const tabelasPath = path.join(__dirname, '..', 'data', 'tabelas-inss-historico.json');
      const tabelasJson = fs.readFileSync(tabelasPath, 'utf8');
      return JSON.parse(tabelasJson);
    } catch (error) {
      console.warn('Erro ao carregar tabelas históricas, usando tabelas padrão:', error.message);
      // Fallback para tabelas recentes
      return {
        2024: {
          faixas: [
            { limite: 1412.00, aliquota: 7.5 },
            { limite: 2666.68, aliquota: 9.0 },
            { limite: 4000.03, aliquota: 12.0 },
            { limite: 7786.02, aliquota: 14.0 }
          ],
          teto: 7786.02
        },
        2025: {
          faixas: [
            { limite: 1518.00, aliquota: 7.5 },
            { limite: 2793.88, aliquota: 9.0 },
            { limite: 4190.83, aliquota: 12.0 },
            { limite: 8157.41, aliquota: 14.0 }
          ],
          teto: 8157.41
        },
        2026: {
          faixas: [
            { limite: 1621.00, aliquota: 7.5 },
            { limite: 2902.84, aliquota: 9.0 },
            { limite: 4354.27, aliquota: 12.0 },
            { limite: 8475.55, aliquota: 14.0 }
          ],
          teto: 8475.55,
          minimoRecolhimento: 10.00
        }
      };
    }
  })();

  static ALIQUOTA_PRO_LABORE = 11.0; // 11% para pró-labore

  /**
   * Obtém a tabela do ano atual ou especificado
   */
  static getTabela(ano = null) {
    if (!ano) {
      ano = new Date().getFullYear();
    }
    
    // Se o ano não existe, usa o mais recente disponível
    if (!this.TABELAS[ano]) {
      const anosDisponiveis = Object.keys(this.TABELAS).map(Number).sort((a, b) => b - a);
      ano = anosDisponiveis[0]; // Usa o ano mais recente
    }
    
    return this.TABELAS[ano];
  }

  /**
   * Calcula INSS progressivo
   * @param {number} salarioBruto 
   * @param {boolean} proLabore 
   * @param {number} ano - Ano da tabela (opcional, usa ano atual se não informado)
   * @returns {Object}
   */
  static calcular(salarioBruto, proLabore = false, ano = null) {
    if (proLabore) {
      return this.calcularProLabore(salarioBruto, ano);
    }

    const tabela = this.getTabela(ano);
    const FAIXAS = tabela.faixas;
    const TETO_PREVIDENCIARIO = tabela.teto;
    const anoUsado = ano || new Date().getFullYear();

    const memoria = [];
    let valorTotal = 0;
    let salarioRestante = salarioBruto;

    memoria.push({
      passo: 1,
      descricao: `Salário Bruto: R$ ${salarioBruto.toFixed(2)}`,
      valor: salarioBruto.toFixed(2)
    });

    memoria.push({
      passo: 2,
      descricao: `Tabela de INSS ${anoUsado} (Teto: R$ ${TETO_PREVIDENCIARIO.toFixed(2)})`,
      valor: `Ano ${anoUsado}`
    });

    // Percorre as faixas
    for (let i = 0; i < FAIXAS.length; i++) {
      const faixa = FAIXAS[i];
      const faixaAnterior = i > 0 ? FAIXAS[i - 1] : { limite: 0 };

      if (salarioRestante <= 0) break;

      // Valor base da faixa
      const baseFaixa = Math.min(
        faixa.limite - faixaAnterior.limite,
        salarioRestante
      );

      if (baseFaixa > 0) {
        const valorFaixa = (baseFaixa * faixa.aliquota) / 100;
        valorTotal += valorFaixa;

        memoria.push({
          passo: i + 3,
          descricao: `Faixa ${i + 1}: ${faixa.aliquota}% sobre R$ ${baseFaixa.toFixed(2)}`,
          calculo: `R$ ${baseFaixa.toFixed(2)} × ${faixa.aliquota}% = R$ ${valorFaixa.toFixed(2)}`,
          valor: valorFaixa.toFixed(2),
          detalhe: `De R$ ${faixaAnterior.limite.toFixed(2)} até R$ ${faixa.limite.toFixed(2)}`
        });

        salarioRestante -= baseFaixa;
      }
    }

    // Limita ao teto
    if (salarioBruto > TETO_PREVIDENCIARIO) {
      const valorTeto = (TETO_PREVIDENCIARIO * FAIXAS[3].aliquota) / 100;
      if (valorTotal > valorTeto) {
        valorTotal = valorTeto;
        memoria.push({
          passo: memoria.length + 1,
          descricao: 'Aplicação do Teto Previdenciário',
          calculo: `INSS limitado ao teto de R$ ${TETO_PREVIDENCIARIO.toFixed(2)}: R$ ${valorTeto.toFixed(2)}`,
          valor: valorTeto.toFixed(2)
        });
      }
    }

    return {
      salarioBruto,
      valorINSS: parseFloat(valorTotal.toFixed(2)),
      aliquotaEfetiva: parseFloat(((valorTotal / salarioBruto) * 100).toFixed(2)),
      ano: anoUsado,
      teto: TETO_PREVIDENCIARIO,
      minimoRecolhimento: tabela.minimoRecolhimento || null,
      memoria,
      baseLegal: {
        titulo: 'Lei nº 8.212, de 24 de julho de 1991',
        artigo: 'Art. 28',
        descricao: `Tabela de INSS ${anoUsado}: Estabelece o cálculo progressivo do INSS por faixas de contribuição. Teto previdenciário: R$ ${TETO_PREVIDENCIARIO.toFixed(2)}.`
      }
    };
  }

  /**
   * Calcula INSS para pró-labore (alíquota fixa)
   * @param {number} salarioBruto 
   * @param {number} ano - Ano da tabela (opcional)
   */
  static calcularProLabore(salarioBruto, ano = null) {
    const tabela = this.getTabela(ano);
    const TETO_PREVIDENCIARIO = tabela.teto;
    const anoUsado = ano || new Date().getFullYear();
    
    const baseCalculo = Math.min(salarioBruto, TETO_PREVIDENCIARIO);
    const valorINSS = (baseCalculo * this.ALIQUOTA_PRO_LABORE) / 100;

    const memoria = [
      {
        passo: 1,
        descricao: `Salário Bruto: R$ ${salarioBruto.toFixed(2)}`,
        valor: salarioBruto.toFixed(2)
      },
      {
        passo: 2,
        descricao: `Tabela de INSS ${anoUsado} (Teto: R$ ${TETO_PREVIDENCIARIO.toFixed(2)})`,
        valor: `Ano ${anoUsado}`
      },
      {
        passo: 3,
        descricao: `Base de Cálculo (limitada ao teto): R$ ${baseCalculo.toFixed(2)}`,
        valor: baseCalculo.toFixed(2)
      },
      {
        passo: 4,
        descricao: `Cálculo Pró-labore: ${this.ALIQUOTA_PRO_LABORE}% sobre R$ ${baseCalculo.toFixed(2)}`,
        calculo: `R$ ${baseCalculo.toFixed(2)} × ${this.ALIQUOTA_PRO_LABORE}% = R$ ${valorINSS.toFixed(2)}`,
        valor: valorINSS.toFixed(2)
      }
    ];

    return {
      salarioBruto,
      valorINSS: parseFloat(valorINSS.toFixed(2)),
      aliquotaEfetiva: parseFloat(((valorINSS / baseCalculo) * 100).toFixed(2)),
      proLabore: true,
      ano: anoUsado,
      teto: TETO_PREVIDENCIARIO,
      minimoRecolhimento: tabela.minimoRecolhimento || null,
      memoria,
      baseLegal: {
        titulo: 'Lei nº 8.212, de 24 de julho de 1991',
        artigo: 'Art. 28',
        descricao: `Pró-labore ${anoUsado}: alíquota fixa de 11% sobre o salário, limitado ao teto previdenciário de R$ ${TETO_PREVIDENCIARIO.toFixed(2)}.`
      }
    };
  }
}

module.exports = INSSService;

