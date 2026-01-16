/**
 * SERVICE: FGTSService
 * Cálculo de FGTS por tipo de registro
 * 
 * BASE LEGAL: Lei nº 8.036/1990 (FGTS)
 */

class FGTSService {
  static TIPOS = {
    clt_geral: {
      nome: 'CLT Geral',
      percentual: 8.0,
      descricao: 'Trabalhador regido pela CLT'
    },
    jovem_aprendiz: {
      nome: 'Jovem Aprendiz',
      percentual: 2.0,
      descricao: 'Contrato de aprendizagem (Lei 10.097/2000)'
    },
    domestico: {
      nome: 'Trabalhador Doméstico',
      percentual: 8.0,
      percentual_adicional: 3.2, // Seguro-desemprego doméstico
      descricao: 'Trabalhador doméstico (PEC das Domésticas)'
    }
  };

  /**
   * Calcula FGTS
   * @param {number} salarioBruto 
   * @param {string} tipoRegistro 
   * @returns {Object}
   */
  static calcular(salarioBruto, tipoRegistro = 'clt_geral') {
    const tipo = this.TIPOS[tipoRegistro];
    if (!tipo) {
      throw new Error('Tipo de registro inválido');
    }

    const memoria = [];

    memoria.push({
      passo: 1,
      descricao: `Salário Bruto: R$ ${salarioBruto.toFixed(2)}`,
      valor: salarioBruto.toFixed(2)
    });

    memoria.push({
      passo: 2,
      descricao: `Tipo de Registro: ${tipo.nome}`,
      valor: tipo.nome
    });

    // FGTS principal
    const valorFGTS = (salarioBruto * tipo.percentual) / 100;
    
    memoria.push({
      passo: 3,
      descricao: `FGTS (${tipo.percentual}%): R$ ${valorFGTS.toFixed(2)}`,
      calculo: `R$ ${salarioBruto.toFixed(2)} × ${tipo.percentual}% = R$ ${valorFGTS.toFixed(2)}`,
      valor: valorFGTS.toFixed(2)
    });

    let valorTotal = valorFGTS;
    let valorAdicional = 0;

    // Adicional para doméstico
    if (tipoRegistro === 'domestico' && tipo.percentual_adicional) {
      valorAdicional = (salarioBruto * tipo.percentual_adicional) / 100;
      valorTotal += valorAdicional;

      memoria.push({
        passo: 4,
        descricao: `Seguro-desemprego doméstico (${tipo.percentual_adicional}%): R$ ${valorAdicional.toFixed(2)}`,
        calculo: `R$ ${salarioBruto.toFixed(2)} × ${tipo.percentual_adicional}% = R$ ${valorAdicional.toFixed(2)}`,
        valor: valorAdicional.toFixed(2)
      });

      memoria.push({
        passo: 5,
        descricao: `Total FGTS + Adicional: R$ ${valorTotal.toFixed(2)}`,
        calculo: `R$ ${valorFGTS.toFixed(2)} + R$ ${valorAdicional.toFixed(2)} = R$ ${valorTotal.toFixed(2)}`,
        valor: valorTotal.toFixed(2),
        destaque: true
      });
    }

    return {
      salarioBruto,
      tipoRegistro,
      tipoNome: tipo.nome,
      percentualFGTS: tipo.percentual,
      percentualAdicional: tipo.percentual_adicional || 0,
      valorFGTS: parseFloat(valorFGTS.toFixed(2)),
      valorAdicional: parseFloat(valorAdicional.toFixed(2)),
      valorTotal: parseFloat(valorTotal.toFixed(2)),
      memoria,
      educacao: {
        titulo: 'FGTS não é desconto do funcionário',
        descricao: 'O FGTS é um custo do empregador, depositado mensalmente em conta vinculada do trabalhador. O funcionário não tem desconto em folha de pagamento.',
        observacao: 'Em caso de rescisão sem justa causa, o trabalhador tem direito a multa de 40% sobre o saldo do FGTS.'
      },
      baseLegal: {
        titulo: 'Lei nº 8.036, de 11 de maio de 1990',
        artigo: 'Art. 15',
        descricao: 'Estabelece o depósito mensal de 8% do salário bruto em conta vinculada do trabalhador. Jovem Aprendiz: 2% (Art. 15, § 7º). Doméstico: 8% + 3,2% adicional conforme legislação específica.'
      }
    };
  }
}

module.exports = FGTSService;

