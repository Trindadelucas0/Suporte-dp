/**
 * CONTROLLER: PDFController
 * Gera PDFs profissionais sob demanda (não salva no banco)
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

class PDFController {
  /**
   * Gera PDF sob demanda a partir dos dados enviados
   */
  static async gerar(req, res) {
    const { tipo } = req.params;
    let dados = req.body;

    // Se os dados vieram como string JSON, parse
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        return res.status(400).send('Dados inválidos');
      }
    }

    // Se os dados vieram em req.body.dados
    if (dados.dados) {
      try {
        dados = typeof dados.dados === 'string' ? JSON.parse(dados.dados) : dados.dados;
      } catch (e) {
        return res.status(400).send('Dados inválidos');
      }
    }

    try {
      let pdfDoc;
      let filename;

      switch (tipo) {
        case 'inss':
          pdfDoc = await this.gerarPDFINSS(dados);
          filename = `INSS_${new Date().getTime()}.pdf`;
          break;
        case 'irrf':
          pdfDoc = await this.gerarPDFIRRF(dados);
          filename = `IRRF_${new Date().getTime()}.pdf`;
          break;
        case 'fgts':
          pdfDoc = await this.gerarPDFFGTS(dados);
          filename = `FGTS_${new Date().getTime()}.pdf`;
          break;
        case 'avos':
          pdfDoc = await this.gerarPDFAvos(dados);
          filename = `Avos_${new Date().getTime()}.pdf`;
          break;
        default:
          return res.status(404).send('Tipo de cálculo não encontrado');
      }

      const pdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBytes);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      res.status(500).send('Erro ao gerar PDF');
    }
  }

  static async gerarPDFINSS(dados) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;

    // Cabeçalho
    page.drawText('CÁLCULO DE INSS', {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 40;

    // Dados do usuário
    if (dados.usuario) {
      page.drawText(`Usuário: ${dados.usuario.nome}`, { x: 50, y, size: 12, font });
      y -= 20;
      if (dados.usuario.email) {
        page.drawText(`Email: ${dados.usuario.email}`, { x: 50, y, size: 12, font });
        y -= 20;
      }
    }
    page.drawText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { x: 50, y, size: 12, font });
    y -= 30;

    // Dados do cálculo
    page.drawText(`Salário Bruto: R$ ${parseFloat(dados.salarioBruto || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 14,
      font: fontBold
    });
    y -= 25;

    if (dados.ano) {
      page.drawText(`Tabela de INSS: ${dados.ano}`, {
        x: 50,
        y,
        size: 12,
        font
      });
      y -= 20;
    }

    page.drawText(`Valor INSS: R$ ${parseFloat(dados.valorINSS || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 30;

    // Tabela de faixas
    if (dados.tabelaFaixas) {
      page.drawText('TABELA DE FAIXAS DE INSS', {
        x: 50,
        y,
        size: 12,
        font: fontBold
      });
      y -= 20;

      let faixaAnterior = 0;
      dados.tabelaFaixas.forEach((faixa, index) => {
        if (y < 150) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }

        page.drawText(`Faixa ${index + 1}: ${faixa.aliquota}%`, {
          x: 60,
          y,
          size: 10,
          font: fontBold
        });
        y -= 15;

        page.drawText(`   De R$ ${faixaAnterior.toFixed(2)} até R$ ${faixa.limite.toFixed(2)}`, {
          x: 60,
          y,
          size: 9,
          font
        });
        y -= 15;

        faixaAnterior = faixa.limite;
      });
      y -= 10;
    }

    // Memória de cálculo
    page.drawText('MEMÓRIA DE CÁLCULO', {
      x: 50,
      y,
      size: 14,
      font: fontBold
    });
    y -= 25;

    if (dados.memoria && Array.isArray(dados.memoria)) {
      for (const passo of dados.memoria) {
        if (y < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }

        page.drawText(`${passo.passo}. ${passo.descricao}`, {
          x: 60,
          y,
          size: 10,
          font
        });
        y -= 15;

        if (passo.calculo) {
          page.drawText(`   ${passo.calculo}`, {
            x: 60,
            y,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 15;
        }

        if (passo.valor) {
          page.drawText(`   Valor: R$ ${passo.valor}`, {
            x: 60,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2)
          });
          y -= 15;
        }
      }
    }

    // Base Legal
    if (dados.baseLegal) {
      if (y < 200) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = 800;
      }

      y -= 20;
      page.drawText('BASE LEGAL', {
        x: 50,
        y,
        size: 14,
        font: fontBold
      });
      y -= 20;

      page.drawText(dados.baseLegal.titulo || '', {
        x: 50,
        y,
        size: 11,
        font: fontBold
      });
      y -= 15;

      if (dados.baseLegal.artigo) {
        page.drawText(`Artigo: ${dados.baseLegal.artigo}`, {
          x: 50,
          y,
          size: 10,
          font
        });
        y -= 15;
      }

      if (dados.baseLegal.textoCompleto) {
        const texto = dados.baseLegal.textoCompleto;
        const linhas = this.quebrarTexto(texto, 80);
        for (const linha of linhas) {
          if (y < 50) {
            const newPage = pdfDoc.addPage([595, 842]);
            y = 800;
          }
          page.drawText(linha, {
            x: 50,
            y,
            size: 9,
            font
          });
          y -= 12;
        }
      }
    }

    return pdfDoc;
  }

  static async gerarPDFIRRF(dados) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;

    page.drawText('CÁLCULO DE IRRF', {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 40;

    if (dados.usuario) {
      page.drawText(`Usuário: ${dados.usuario.nome}`, { x: 50, y, size: 12, font });
      y -= 20;
    }
    page.drawText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { x: 50, y, size: 12, font });
    y -= 30;

    page.drawText(`Salário Bruto: R$ ${parseFloat(dados.salarioBruto || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 14,
      font: fontBold
    });
    y -= 20;

    page.drawText(`(-) INSS: R$ ${parseFloat(dados.valorINSS || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 20;

    page.drawText(`(-) Dependentes: ${dados.dependentes || 0}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 20;

    page.drawText(`Base de Cálculo: R$ ${parseFloat(dados.baseCalculo || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 25;

    page.drawText(`IRRF: R$ ${parseFloat(dados.valorIRRF || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 30;

    // Tabela de IRRF
    if (dados.faixas) {
      page.drawText('TABELA PROGRESSIVA DE IRRF', {
        x: 50,
        y,
        size: 12,
        font: fontBold
      });
      y -= 20;

      dados.faixas.forEach((faixa, index) => {
        if (y < 150) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }

        const limiteTexto = faixa.limite === Infinity ? 'Acima de' : `Até R$ ${faixa.limite.toFixed(2)}`;
        page.drawText(`${limiteTexto} - Alíquota: ${faixa.aliquota}% - Dedução: R$ ${faixa.deducao.toFixed(2)}`, {
          x: 60,
          y,
          size: 9,
          font
        });
        y -= 15;
      });
      y -= 10;
    }

    // Memória
    page.drawText('MEMÓRIA DE CÁLCULO', {
      x: 50,
      y,
      size: 14,
      font: fontBold
    });
    y -= 25;

    if (dados.memoria && Array.isArray(dados.memoria)) {
      for (const passo of dados.memoria) {
        if (y < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }

        page.drawText(`${passo.passo}. ${passo.descricao}`, {
          x: 60,
          y,
          size: 10,
          font
        });
        y -= 15;

        if (passo.calculo) {
          page.drawText(`   ${passo.calculo}`, {
            x: 60,
            y,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 15;
        }
      }
    }

    // Base Legal
    if (dados.baseLegal && dados.baseLegal.textoCompleto) {
      if (y < 200) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = 800;
      }

      y -= 20;
      page.drawText('BASE LEGAL', {
        x: 50,
        y,
        size: 14,
        font: fontBold
      });
      y -= 20;

      const texto = dados.baseLegal.textoCompleto;
      const linhas = this.quebrarTexto(texto, 80);
      for (const linha of linhas) {
        if (y < 50) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }
        page.drawText(linha, {
          x: 50,
          y,
          size: 9,
          font
        });
        y -= 12;
      }
    }

    return pdfDoc;
  }

  static async gerarPDFFGTS(dados) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;

    page.drawText('CÁLCULO DE FGTS', {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 40;

    if (dados.usuario) {
      page.drawText(`Usuário: ${dados.usuario.nome}`, { x: 50, y, size: 12, font });
      y -= 20;
    }
    page.drawText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { x: 50, y, size: 12, font });
    y -= 30;

    page.drawText(`Salário Bruto: R$ ${parseFloat(dados.salarioBruto || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 14,
      font: fontBold
    });
    y -= 25;

    page.drawText(`FGTS: R$ ${parseFloat(dados.valorTotal || 0).toFixed(2)}`, {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 30;

    // Memória
    if (dados.memoria && Array.isArray(dados.memoria)) {
      page.drawText('MEMÓRIA DE CÁLCULO', {
        x: 50,
        y,
        size: 14,
        font: fontBold
      });
      y -= 25;

      for (const passo of dados.memoria) {
        if (y < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }

        page.drawText(`${passo.passo}. ${passo.descricao}`, {
          x: 60,
          y,
          size: 10,
          font
        });
        y -= 15;

        if (passo.calculo) {
          page.drawText(`   ${passo.calculo}`, {
            x: 60,
            y,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 15;
        }
      }
    }

    // Base Legal
    if (dados.baseLegal && dados.baseLegal.textoCompleto) {
      if (y < 200) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = 800;
      }

      y -= 20;
      page.drawText('BASE LEGAL', {
        x: 50,
        y,
        size: 14,
        font: fontBold
      });
      y -= 20;

      const texto = dados.baseLegal.textoCompleto;
      const linhas = this.quebrarTexto(texto, 80);
      for (const linha of linhas) {
        if (y < 50) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }
        page.drawText(linha, {
          x: 50,
          y,
          size: 9,
          font
        });
        y -= 12;
      }
    }

    return pdfDoc;
  }

  static async gerarPDFAvos(dados) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;

    page.drawText('CÁLCULO DE AVOS - 13º SALÁRIO', {
      x: 50,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 40;

    if (dados.usuario) {
      page.drawText(`Usuário: ${dados.usuario.nome}`, { x: 50, y, size: 12, font });
      y -= 20;
    }
    page.drawText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, { x: 50, y, size: 12, font });
    y -= 30;

    page.drawText(`Data de Admissão: ${dados.dataAdmissao || ''}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 20;

    page.drawText(`Data de Referência: ${dados.dataReferencia || ''}`, {
      x: 50,
      y,
      size: 12,
      font
    });
    y -= 25;

    page.drawText(`Avos: ${dados.totalAvos || dados.avos || 0}/12`, {
      x: 50,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2)
    });
    y -= 30;

    // Memória
    if (dados.memoria && Array.isArray(dados.memoria)) {
      page.drawText('MEMÓRIA DE CÁLCULO', {
        x: 50,
        y,
        size: 14,
        font: fontBold
      });
      y -= 25;

      for (const passo of dados.memoria) {
        if (y < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }

        page.drawText(`${passo.passo}. ${passo.descricao}`, {
          x: 60,
          y,
          size: 10,
          font
        });
        y -= 15;

        if (passo.calculo) {
          page.drawText(`   ${passo.calculo}`, {
            x: 60,
            y,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
          y -= 15;
        }

        if (passo.detalhes && Array.isArray(passo.detalhes)) {
          for (const mes of passo.detalhes) {
            page.drawText(`   ${mes.mes}: ${mes.diasTrabalhados} dias → ${mes.avo} avo(s)`, {
              x: 70,
              y,
              size: 8,
              font,
              color: rgb(0.5, 0.5, 0.5)
            });
            y -= 12;
          }
        }
      }
    }

    // Base Legal
    if (dados.baseLegal && dados.baseLegal.textoCompleto) {
      if (y < 200) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = 800;
      }

      y -= 20;
      page.drawText('BASE LEGAL', {
        x: 50,
        y,
        size: 14,
        font: fontBold
      });
      y -= 20;

      const texto = dados.baseLegal.textoCompleto;
      const linhas = this.quebrarTexto(texto, 80);
      for (const linha of linhas) {
        if (y < 50) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = 800;
        }
        page.drawText(linha, {
          x: 50,
          y,
          size: 9,
          font
        });
        y -= 12;
      }
    }

    return pdfDoc;
  }

  /**
   * Quebra texto em linhas para o PDF
   */
  static quebrarTexto(texto, maxChars) {
    const palavras = texto.split(' ');
    const linhas = [];
    let linhaAtual = '';

    for (const palavra of palavras) {
      if ((linhaAtual + palavra).length <= maxChars) {
        linhaAtual += (linhaAtual ? ' ' : '') + palavra;
      } else {
        if (linhaAtual) linhas.push(linhaAtual);
        linhaAtual = palavra;
      }
    }
    if (linhaAtual) linhas.push(linhaAtual);

    return linhas;
  }
}

module.exports = PDFController;
