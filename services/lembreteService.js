/**
 * SERVICE: LembreteService
 * Gerencia envio de lembretes de cobrança
 */

const Cobranca = require('../models/Cobranca');
const User = require('../models/User');
const emailService = require('./emailService');
const db = require('../config/database');
const path = require('path');

class LembreteService {
  /**
   * Envia lembretes pré-vencimento
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarLembretesPreVencimento() {
    console.log('🔄 Iniciando envio de lembretes pré-vencimento...');

    const hoje = new Date();
    const resultados = {
      enviados: 0,
      erros: 0
    };

    // Verifica configurações
    const lembrete5Dias = process.env.DIAS_LEMBRETE_PRE_5 === 'true';
    const lembrete2Dias = process.env.DIAS_LEMBRETE_PRE_2 === 'true';
    const lembrete0Dias = process.env.DIAS_LEMBRETE_PRE_0 === 'true';

    // Lembrete 5 dias antes
    if (lembrete5Dias) {
      const data5Dias = new Date(hoje);
      data5Dias.setDate(data5Dias.getDate() + 5);
      const cobrancas = await this.getCobrancasPorData(data5Dias);
      for (const cobranca of cobrancas) {
        try {
          await this.enviarLembrete(cobranca, 'pre_5_dias');
          resultados.enviados++;
        } catch (error) {
          console.error(`❌ Erro ao enviar lembrete 5 dias para cobrança ${cobranca.id}:`, error.message);
          resultados.erros++;
        }
      }
    }

    // Lembrete 2 dias antes
    if (lembrete2Dias) {
      const data2Dias = new Date(hoje);
      data2Dias.setDate(data2Dias.getDate() + 2);
      const cobrancas = await this.getCobrancasPorData(data2Dias);
      for (const cobranca of cobrancas) {
        try {
          await this.enviarLembrete(cobranca, 'pre_2_dias');
          resultados.enviados++;
        } catch (error) {
          console.error(`❌ Erro ao enviar lembrete 2 dias para cobrança ${cobranca.id}:`, error.message);
          resultados.erros++;
        }
      }
    }

    // Lembrete no dia do vencimento
    if (lembrete0Dias) {
      const cobrancas = await this.getCobrancasPorData(hoje);
      for (const cobranca of cobrancas) {
        try {
          await this.enviarLembrete(cobranca, 'pre_0_dias');
          resultados.enviados++;
        } catch (error) {
          console.error(`❌ Erro ao enviar lembrete vencimento para cobrança ${cobranca.id}:`, error.message);
          resultados.erros++;
        }
      }
    }

    console.log(`✅ Lembretes enviados: ${resultados.enviados}, Erros: ${resultados.erros}`);
    return resultados;
  }

  /**
   * Envia avisos de atraso
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarAvisosAtraso() {
    console.log('🔄 Iniciando envio de avisos de atraso...');

    const hoje = new Date();
    const resultados = {
      enviados: 0,
      erros: 0
    };

    // Verifica configurações
    const aviso1Dia = process.env.DIAS_AVISO_ATRASO_1 === 'true';
    const aviso5Dias = process.env.DIAS_AVISO_ATRASO_5 === 'true';

    // Aviso 1 dia após atraso
    if (aviso1Dia) {
      const data1Dia = new Date(hoje);
      data1Dia.setDate(data1Dia.getDate() - 1);
      const cobrancas = await this.getCobrancasVencidasPorData(data1Dia);
      for (const cobranca of cobrancas) {
        try {
          await this.enviarAvisoAtraso(cobranca, 'atraso_1_dia');
          resultados.enviados++;
        } catch (error) {
          console.error(`❌ Erro ao enviar aviso 1 dia para cobrança ${cobranca.id}:`, error.message);
          resultados.erros++;
        }
      }
    }

    // Aviso 5 dias após atraso
    if (aviso5Dias) {
      const data5Dias = new Date(hoje);
      data5Dias.setDate(data5Dias.getDate() - 5);
      const cobrancas = await this.getCobrancasVencidasPorData(data5Dias);
      for (const cobranca of cobrancas) {
        try {
          await this.enviarAvisoAtraso(cobranca, 'atraso_5_dias');
          resultados.enviados++;
        } catch (error) {
          console.error(`❌ Erro ao enviar aviso 5 dias para cobrança ${cobranca.id}:`, error.message);
          resultados.erros++;
        }
      }
    }

    console.log(`✅ Avisos enviados: ${resultados.enviados}, Erros: ${resultados.erros}`);
    return resultados;
  }

  /**
   * Busca cobranças por data de vencimento
   * @param {Date} data - Data
   * @returns {Promise<Array>} Lista de cobranças
   */
  async getCobrancasPorData(data) {
    const dataStr = data.toISOString().split('T')[0];
    const result = await db.query(
      `SELECT c.*, u.nome, u.email 
       FROM cobrancas c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.status = 'pendente' 
       AND c.data_vencimento = $1
       AND (u.bloqueado_pagamento = FALSE OR u.bloqueado_pagamento IS NULL)`,
      [dataStr]
    );
    return result.rows;
  }

  /**
   * Busca cobranças vencidas por data
   * @param {Date} data - Data de vencimento
   * @returns {Promise<Array>} Lista de cobranças
   */
  async getCobrancasVencidasPorData(data) {
    const dataStr = data.toISOString().split('T')[0];
    const result = await db.query(
      `SELECT c.*, u.nome, u.email 
       FROM cobrancas c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.status IN ('pendente', 'vencida')
       AND c.data_vencimento = $1
       AND (u.bloqueado_pagamento = FALSE OR u.bloqueado_pagamento IS NULL)`,
      [dataStr]
    );
    return result.rows;
  }

  /**
   * Envia lembrete pré-vencimento
   * @param {Object} cobranca - Cobrança
   * @param {string} tipo - Tipo do lembrete
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarLembrete(cobranca, tipo) {
    // Verifica se já foi enviado
    const lembretes = Array.isArray(cobranca.lembretes_enviados) 
      ? cobranca.lembretes_enviados 
      : JSON.parse(cobranca.lembretes_enviados || '[]');

    if (lembretes.find(l => l.tipo === tipo)) {
      return { success: true, message: 'Lembrete já enviado' };
    }

    // Busca dados do usuário
    const user = await User.findById(cobranca.user_id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Calcula dias até vencimento
    const hoje = new Date();
    const vencimento = new Date(cobranca.data_vencimento);
    const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

    // Prepara dados do email
    const appName = process.env.APP_NAME || 'Suporte DP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const linkPagamento = cobranca.link_pagamento || `${appUrl}/cobranca/pagar/${cobranca.id}`;

    const emailData = {
      to: user.email,
      subject: `⏰ Lembrete: Sua mensalidade vence em ${diasRestantes} dia(s)`,
      html: this.getTemplateLembrete({
        nome: user.nome,
        diasRestantes: diasRestantes,
        valor: cobranca.valor,
        dataVencimento: this.formatDate(cobranca.data_vencimento),
        linkPagamento: linkPagamento,
        appName: appName
      })
    };

    // Envia email
    const resultado = await emailService.sendEmail(emailData);

    if (resultado.success) {
      // Marca lembrete como enviado
      await Cobranca.addLembreteEnviado(cobranca.id, tipo);
    }

    return resultado;
  }

  /**
   * Envia aviso de atraso
   * @param {Object} cobranca - Cobrança
   * @param {string} tipo - Tipo do aviso
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarAvisoAtraso(cobranca, tipo) {
    // Verifica se já foi enviado
    const lembretes = Array.isArray(cobranca.lembretes_enviados) 
      ? cobranca.lembretes_enviados 
      : JSON.parse(cobranca.lembretes_enviados || '[]');

    if (lembretes.find(l => l.tipo === tipo)) {
      return { success: true, message: 'Aviso já enviado' };
    }

    // Busca dados do usuário
    const user = await User.findById(cobranca.user_id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Calcula dias de atraso
    const hoje = new Date();
    const vencimento = new Date(cobranca.data_vencimento);
    const diasAtraso = Math.ceil((hoje - vencimento) / (1000 * 60 * 60 * 24));

    // Prepara dados do email
    const appName = process.env.APP_NAME || 'Suporte DP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const linkPagamento = cobranca.link_pagamento || `${appUrl}/cobranca/pagar/${cobranca.id}`;

    const emailData = {
      to: user.email,
      subject: `⚠️ Aviso: Sua mensalidade está atrasada há ${diasAtraso} dia(s)`,
      html: this.getTemplateAtraso({
        nome: user.nome,
        diasAtraso: diasAtraso,
        valor: cobranca.valor,
        dataVencimento: this.formatDate(cobranca.data_vencimento),
        linkPagamento: linkPagamento,
        appName: appName
      })
    };

    // Envia email
    const resultado = await emailService.sendEmail(emailData);

    if (resultado.success) {
      // Marca aviso como enviado
      await Cobranca.addLembreteEnviado(cobranca.id, tipo);
    }

    return resultado;
  }

  /**
   * Template HTML para lembrete pré-vencimento
   */
  getTemplateLembrete(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .info { background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⏰ Lembrete de Vencimento</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${data.nome}</strong>!</p>
          <p>Sua mensalidade vence em <strong>${data.diasRestantes} dia(s)</strong>.</p>
          <div class="info">
            <p><strong>Valor:</strong> R$ ${parseFloat(data.valor).toFixed(2)}</p>
            <p><strong>Vencimento:</strong> ${data.dataVencimento}</p>
          </div>
          <div style="text-align: center;">
            <a href="${data.linkPagamento}" class="button">Pagar Agora</a>
          </div>
          <p>Atenciosamente,<br><strong>Equipe ${data.appName}</strong></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template HTML para aviso de atraso
   */
  getTemplateAtraso(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Mensalidade em Atraso</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${data.nome}</strong>!</p>
          <p>Sua mensalidade está atrasada há <strong>${data.diasAtraso} dia(s)</strong>.</p>
          <div class="warning">
            <p><strong>Valor:</strong> R$ ${parseFloat(data.valor).toFixed(2)}</p>
            <p><strong>Vencimento:</strong> ${data.dataVencimento}</p>
            <p><strong>⚠️ Importante:</strong> Para evitar bloqueio de acesso, efetue o pagamento o quanto antes.</p>
          </div>
          <div style="text-align: center;">
            <a href="${data.linkPagamento}" class="button">Pagar Agora</a>
          </div>
          <p>Atenciosamente,<br><strong>Equipe ${data.appName}</strong></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Formata data para exibição
   */
  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  }
}

module.exports = new LembreteService();

