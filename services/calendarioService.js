/**
 * SERVICE: CalendarioService
 * Lógica de negócio para cálculos de calendário e dias úteis
 */

const db = require('../config/database');
const Feriado = require('../models/Feriado');
const moment = require('moment');

class CalendarioService {
  /**
   * Calcula dias úteis em um período
   * @param {Date} dataInicio 
   * @param {Date} dataFim 
   * @param {string} tipoSemana - 'segunda_sexta' ou 'segunda_sabado'
   * @returns {Promise<Object>}
   */
  static async calcularDiasUteis(dataInicio, dataFim, tipoSemana = 'segunda_sexta') {
    const inicio = moment(dataInicio);
    const fim = moment(dataFim);
    const feriados = await Feriado.findAll();
    const feriadosSet = new Set(feriados.map(f => f.data.toISOString().split('T')[0]));

    let diasUteis = 0;
    let domingos = 0;
    let sabados = 0;
    let feriadosCount = 0;
    const detalhes = [];

    let current = inicio.clone();
    while (current.isSameOrBefore(fim)) {
      const dataStr = current.format('YYYY-MM-DD');
      const diaSemana = current.day(); // 0 = domingo, 6 = sábado
      const isFeriado = feriadosSet.has(dataStr);

      if (isFeriado) {
        feriadosCount++;
        detalhes.push({
          data: dataStr,
          tipo: 'feriado',
          nome: feriados.find(f => f.data.toISOString().split('T')[0] === dataStr)?.nome || 'Feriado'
        });
      } else if (diaSemana === 0) {
        domingos++;
        detalhes.push({
          data: dataStr,
          tipo: 'domingo'
        });
      } else if (diaSemana === 6) {
        sabados++;
        if (tipoSemana === 'segunda_sabado') {
          diasUteis++;
          detalhes.push({
            data: dataStr,
            tipo: 'sabado_util'
          });
        } else {
          detalhes.push({
            data: dataStr,
            tipo: 'sabado'
          });
        }
      } else {
        diasUteis++;
        detalhes.push({
          data: dataStr,
          tipo: 'util'
        });
      }

      current.add(1, 'day');
    }

    const totalDias = fim.diff(inicio, 'days') + 1;

    return {
      dataInicio: inicio.format('YYYY-MM-DD'),
      dataFim: fim.format('YYYY-MM-DD'),
      totalDias,
      diasUteis,
      domingos,
      sabados,
      feriados: feriadosCount,
      tipoSemana,
      detalhes,
      memoria: {
        formula: `Dias Úteis = Total de Dias - Domingos - ${tipoSemana === 'segunda_sexta' ? 'Sábados - ' : ''}Feriados`,
        calculo: `${totalDias} - ${domingos} - ${tipoSemana === 'segunda_sexta' ? sabados + ' - ' : ''}${feriadosCount} = ${diasUteis}`
      }
    };
  }

  /**
   * Obtém anotação do usuário para uma data
   */
  static async getAnotacao(userId, data) {
    const result = await db.query(
      'SELECT * FROM calendario_anotacoes WHERE user_id = $1 AND data = $2',
      [userId, data]
    );
    return result.rows[0] || null;
  }

  /**
   * Salva ou atualiza anotação
   */
  static async saveAnotacao(userId, data, anotacao) {
    const result = await db.query(
      `INSERT INTO calendario_anotacoes (user_id, data, anotacao)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, data)
       DO UPDATE SET anotacao = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, data, anotacao]
    );
    return result.rows[0];
  }

  /**
   * Obtém calendário mensal com anotações (OTIMIZADO)
   */
  static async getCalendarioMensal(userId, ano, mes) {
    const inicio = moment(`${ano}-${String(mes).padStart(2, '0')}-01`);
    const fim = inicio.clone().endOf('month');
    
    // Busca tudo de uma vez (otimizado)
    // CORREÇÃO: Tratamento de erro caso a tabela calendario_obrigacoes não exista
    let obrigacoes = { rows: [] };
    try {
      obrigacoes = await db.query(
        `SELECT data, tipo, descricao, observacao, id FROM calendario_obrigacoes 
         WHERE user_id = $1 AND data >= $2 AND data <= $3`,
        [userId, inicio.format('YYYY-MM-DD'), fim.format('YYYY-MM-DD')]
      );
    } catch (error) {
      // Se a tabela não existir, continua sem obrigações (não quebra o calendário)
      console.warn('Tabela calendario_obrigacoes não encontrada. Criando tabela...');
      // Tenta criar a tabela
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS calendario_obrigacoes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            data DATE NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            descricao VARCHAR(255) NOT NULL,
            observacao TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_calendario_obrigacoes_user_data ON calendario_obrigacoes(user_id, data);
          CREATE INDEX IF NOT EXISTS idx_calendario_obrigacoes_tipo ON calendario_obrigacoes(tipo);
        `);
        obrigacoes = { rows: [] };
      } catch (createError) {
        console.error('Erro ao criar tabela calendario_obrigacoes:', createError);
        obrigacoes = { rows: [] };
      }
    }

    const [feriados, anotacoes] = await Promise.all([
      Feriado.findAll(ano),
      db.query(
        `SELECT data, anotacao FROM calendario_anotacoes 
         WHERE user_id = $1 AND data >= $2 AND data <= $3`,
        [userId, inicio.format('YYYY-MM-DD'), fim.format('YYYY-MM-DD')]
      )
    ]);

    // Cria mapas para busca rápida
    const feriadosMap = new Map();
    feriados.forEach(f => {
      const dataStr = moment(f.data).format('YYYY-MM-DD');
      feriadosMap.set(dataStr, f);
    });

    const anotacoesMap = new Map();
    anotacoes.rows.forEach(a => {
      anotacoesMap.set(a.data, a.anotacao);
    });

    const obrigacoesMap = new Map();
    obrigacoes.rows.forEach(o => {
      // Garante que a data está no formato correto
      const dataStr = moment(o.data).format('YYYY-MM-DD');
      if (!obrigacoesMap.has(dataStr)) {
        obrigacoesMap.set(dataStr, []);
      }
      obrigacoesMap.get(dataStr).push(o);
    });
    
    const calendario = [];
    let current = inicio.clone();

    while (current.isSameOrBefore(fim)) {
      const dataStr = current.format('YYYY-MM-DD');
      const feriado = feriadosMap.get(dataStr);
      
      calendario.push({
        data: dataStr,
        dia: current.date(),
        diaSemana: current.day(),
        isFeriado: !!feriado,
        feriadoNome: feriado?.nome || null,
        anotacao: anotacoesMap.get(dataStr) || null,
        obrigacoes: obrigacoesMap.get(dataStr) || []
      });

      current.add(1, 'day');
    }

    return calendario;
  }

  /**
   * Obtém obrigações para uma data
   */
  static async getObrigacoes(userId, data) {
    const result = await db.query(
      'SELECT * FROM calendario_obrigacoes WHERE user_id = $1 AND data = $2 ORDER BY tipo',
      [userId, data]
    );
    return result.rows;
  }

  /**
   * Salva ou atualiza obrigação
   */
  static async saveObrigacao(userId, data, tipo, descricao, observacao = null) {
    const result = await db.query(
      `INSERT INTO calendario_obrigacoes (user_id, data, tipo, descricao, observacao)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data, tipo, descricao, observacao]
    );
    return result.rows[0];
  }

  /**
   * Remove obrigação
   */
  static async removeObrigacao(userId, obrigacaoId) {
    const result = await db.query(
      'DELETE FROM calendario_obrigacoes WHERE id = $1 AND user_id = $2 RETURNING *',
      [obrigacaoId, userId]
    );
    return result.rows[0];
  }

  /**
   * Obtém todas as obrigações do mês
   */
  static async getObrigacoesMes(userId, ano, mes) {
    const inicio = moment(`${ano}-${mes}-01`).format('YYYY-MM-DD');
    const fim = moment(`${ano}-${mes}-01`).endOf('month').format('YYYY-MM-DD');
    
    const result = await db.query(
      'SELECT * FROM calendario_obrigacoes WHERE user_id = $1 AND data >= $2 AND data <= $3 ORDER BY data, tipo',
      [userId, inicio, fim]
    );
    return result.rows;
  }

  /**
   * Verifica se uma data é dia útil (não é sábado, domingo nem feriado)
   * 
   * REGRA: Dia útil = Segunda a Sexta, exceto feriados
   * 
   * @param {moment.Moment} data - Data a verificar usando moment.js
   * @param {Array} feriados - Array de objetos feriados do banco de dados
   * @returns {boolean} true se for dia útil, false caso contrário
   */
  static isDiaUtil(data, feriados = []) {
    const diaSemana = data.day(); // 0 = domingo, 6 = sábado
    
    // Verifica se é fim de semana
    if (diaSemana === 0 || diaSemana === 6) {
      return false; // Não é dia útil (sábado ou domingo)
    }

    // Verifica se é feriado
    const dataStr = data.format('YYYY-MM-DD');
    // Feriados podem vir como objeto com propriedade 'data' (Date) ou string
    const feriadosSet = new Set(feriados.map(f => {
      if (typeof f === 'string') {
        return f;
      }
      // Se for objeto, pega a propriedade data
      const dataFeriado = f.data || f;
      return moment(dataFeriado).format('YYYY-MM-DD');
    }));
    
    if (feriadosSet.has(dataStr)) {
      return false; // Não é dia útil (é feriado)
    }

    return true; // É dia útil (segunda a sexta e não é feriado)
  }

  /**
   * Ajusta data para o último dia útil anterior se cair em fim de semana ou feriado
   * 
   * REGRA: Quando vencimento cai em sábado/domingo ou feriado, antecipa-se para o último dia útil anterior
   * Usado para: FGTS, INSS, IRRF (vencimento dia 20)
   * 
   * @param {moment.Moment} data - Data original que precisa ser ajustada
   * @param {Array} feriados - Array de feriados para verificação
   * @returns {moment.Moment} Data ajustada para o último dia útil anterior
   */
  static ajustarParaUltimoDiaUtilAnterior(data, feriados = []) {
    let dataAjustada = data.clone();
    let tentativas = 0;
    const maxTentativas = 10; // Evita loop infinito (segurança)

    // Retrocede dia a dia até encontrar um dia útil
    while (!this.isDiaUtil(dataAjustada, feriados) && tentativas < maxTentativas) {
      dataAjustada.subtract(1, 'day');
      tentativas++;
    }

    return dataAjustada;
  }

  /**
   * Ajusta data para o primeiro dia útil subsequente se cair em fim de semana ou feriado
   * 
   * REGRA: Quando vencimento cai em sábado/domingo ou feriado, adia-se para o primeiro dia útil subsequente
   * Usado para: EFD-Reinf (vencimento dia 15)
   * 
   * @param {moment.Moment} data - Data original que precisa ser ajustada
   * @param {Array} feriados - Array de feriados para verificação
   * @returns {moment.Moment} Data ajustada para o primeiro dia útil subsequente
   */
  static ajustarParaPrimeiroDiaUtilSubsequente(data, feriados = []) {
    let dataAjustada = data.clone();
    let tentativas = 0;
    const maxTentativas = 10; // Evita loop infinito (segurança)

    // Avança dia a dia até encontrar um dia útil
    while (!this.isDiaUtil(dataAjustada, feriados) && tentativas < maxTentativas) {
      dataAjustada.add(1, 'day');
      tentativas++;
    }

    return dataAjustada;
  }

  /**
   * Calcula o último dia útil do mês
   * 
   * REGRA: Último dia útil = último dia do mês que não seja sábado, domingo ou feriado
   * Usado para: DCTFWeb (vencimento no último dia útil do mês)
   * 
   * @param {number} ano - Ano (ex: 2025)
   * @param {number} mes - Mês (1-12)
   * @param {Array} feriados - Array de feriados para verificação
   * @returns {moment.Moment} Último dia útil do mês
   */
  static calcularUltimoDiaUtilMes(ano, mes, feriados = []) {
    // Pega o último dia do mês
    const ultimoDiaMes = moment(`${ano}-${String(mes).padStart(2, '0')}-01`).endOf('month');
    // Ajusta para o último dia útil anterior (caso o último dia não seja útil)
    return this.ajustarParaUltimoDiaUtilAnterior(ultimoDiaMes, feriados);
  }

  /**
   * Limpa obrigações automáticas antigas que possam estar com regras incorretas
   * Útil para corrigir o banco de dados após mudanças nas regras
   * 
   * @param {number} userId - ID do usuário (UUID)
   * @param {number} ano - Ano para limpar (opcional, se não informado limpa todos)
   * @returns {Promise<number>} Número de obrigações removidas
   */
  static async limparObrigacoesAntigas(userId, ano = null) {
    try {
      let query = `
        DELETE FROM calendario_obrigacoes 
        WHERE user_id = $1 
        AND tipo IN ('fgts', 'inss', 'irrf', 'dctfweb', 'efd_reinf')
        AND observacao LIKE '%Competência:%'
      `;
      const params = [userId];
      
      if (ano) {
        // Se ano foi informado, limpa apenas obrigações daquele ano
        query += ` AND observacao LIKE $2`;
        params.push(`%/${ano}%`);
      }
      
      const result = await db.query(query, params);
      console.log(`🧹 Limpeza: ${result.rowCount} obrigações antigas removidas${ano ? ` para o ano ${ano}` : ''}`);
      return result.rowCount;
    } catch (error) {
      console.error('Erro ao limpar obrigações antigas:', error);
      throw error;
    }
  }

  /**
   * GERA AUTOMATICAMENTE as obrigações trabalhistas para um mês de competência
   * 
   * Esta função é chamada automaticamente quando o calendário é carregado.
   * Ela cria as obrigações no banco de dados seguindo as regras legais:
   * 
   * REGRAS DE VENCIMENTO:
   * 1. FGTS: até dia 20 do mês seguinte à competência
   *    - Se cair em sábado/domingo/feriado → antecipa para último dia útil anterior
   * 
   * 2. INSS: até dia 20 do mês seguinte à competência
   *    - Se cair em sábado/domingo/feriado → antecipa para último dia útil anterior
   * 
   * 3. IRRF: até dia 20 do mês seguinte à competência
   *    - Se cair em sábado/domingo/feriado → antecipa para último dia útil anterior
   * 
   * 4. DCTFWeb: último dia útil do mês seguinte à competência (CORRIGIDO)
   *    - Referente ao mês anterior, assim como FGTS, INSS e IRRF
   *    - Sempre o último dia útil do mês seguinte, mesmo que seja dia 28, 29, 30 ou 31
   * 
   * 5. EFD-Reinf: dia 15 do mês seguinte à competência
   *    - Se cair em sábado/domingo/feriado → adia para primeiro dia útil subsequente
   * 
   * IMPORTANTE: A função evita duplicatas - se já existe obrigação do mesmo tipo na mesma data,
   * não cria novamente. Isso permite chamar a função múltiplas vezes sem problemas.
   * 
   * @param {number} userId - ID do usuário (UUID)
   * @param {number} ano - Ano da competência (ex: 2025)
   * @param {number} mes - Mês da competência (1-12)
   * @returns {Promise<Array>} Array de obrigações criadas (pode estar vazio se já existirem)
   */
  static async gerarObrigacoesAutomaticas(userId, ano, mes) {
    // Cria objeto moment para a competência (mês que está sendo visualizado)
    const competencia = moment(`${ano}-${String(mes).padStart(2, '0')}-01`);
    
    // Calcula o mês seguinte (onde ficam os vencimentos de FGTS, INSS, IRRF)
    const mesSeguinte = competencia.clone().add(1, 'month');
    
    // Busca feriados do ano da competência e do mês seguinte
    // Isso é necessário porque os vencimentos podem estar em meses diferentes
    const feriados = await Feriado.findAll(ano);
    const feriadosMesSeguinte = await Feriado.findAll(mesSeguinte.year());
    
    // Combina todos os feriados para verificação completa
    const todosFeriados = [...feriados, ...feriadosMesSeguinte];

    // Array que armazenará todas as obrigações a serem criadas
    const obrigacoes = [];

    // ============================================
    // 1. FGTS - Recolhimento da folha de pagamento
    // ============================================
    // REGRA: até dia 20 do mês seguinte à competência
    const vencimentoFGTS = moment(`${mesSeguinte.year()}-${String(mesSeguinte.month() + 1).padStart(2, '0')}-20`);
    
    // Verifica se o dia 20 é dia útil
    if (!this.isDiaUtil(vencimentoFGTS, todosFeriados)) {
      // Se não for, ajusta para o último dia útil anterior
      const vencimentoAjustado = this.ajustarParaUltimoDiaUtilAnterior(vencimentoFGTS, todosFeriados);
      obrigacoes.push({
        data: vencimentoAjustado.format('YYYY-MM-DD'),
        tipo: 'fgts',
        descricao: 'FGTS - Recolhimento da folha de pagamento',
        observacao: `Competência: ${competencia.format('MM/YYYY')}. Vencimento original: ${vencimentoFGTS.format('DD/MM/YYYY')} (ajustado para ${vencimentoAjustado.format('DD/MM/YYYY')} por ser ${vencimentoFGTS.day() === 0 ? 'domingo' : vencimentoFGTS.day() === 6 ? 'sábado' : 'feriado'})`
      });
    } else {
      // Se for dia útil, usa a data original
      obrigacoes.push({
        data: vencimentoFGTS.format('YYYY-MM-DD'),
        tipo: 'fgts',
        descricao: 'FGTS - Recolhimento da folha de pagamento',
        observacao: `Competência: ${competencia.format('MM/YYYY')}`
      });
    }

    // ============================================
    // 2. INSS - Contribuições previdenciárias
    // ============================================
    // REGRA: até dia 20 do mês seguinte à competência
    const vencimentoINSS = moment(`${mesSeguinte.year()}-${String(mesSeguinte.month() + 1).padStart(2, '0')}-20`);
    
    if (!this.isDiaUtil(vencimentoINSS, todosFeriados)) {
      const vencimentoAjustado = this.ajustarParaUltimoDiaUtilAnterior(vencimentoINSS, todosFeriados);
      obrigacoes.push({
        data: vencimentoAjustado.format('YYYY-MM-DD'),
        tipo: 'inss',
        descricao: 'INSS - Contribuições previdenciárias',
        observacao: `Competência: ${competencia.format('MM/YYYY')}. Vencimento original: ${vencimentoINSS.format('DD/MM/YYYY')} (ajustado para ${vencimentoAjustado.format('DD/MM/YYYY')} por ser ${vencimentoINSS.day() === 0 ? 'domingo' : vencimentoINSS.day() === 6 ? 'sábado' : 'feriado'})`
      });
    } else {
      obrigacoes.push({
        data: vencimentoINSS.format('YYYY-MM-DD'),
        tipo: 'inss',
        descricao: 'INSS - Contribuições previdenciárias',
        observacao: `Competência: ${competencia.format('MM/YYYY')}`
      });
    }

    // ============================================
    // 3. IRRF - Imposto de Renda Retido na Fonte
    // ============================================
    // REGRA: até dia 20 do mês seguinte à competência
    const vencimentoIRRF = moment(`${mesSeguinte.year()}-${String(mesSeguinte.month() + 1).padStart(2, '0')}-20`);
    
    if (!this.isDiaUtil(vencimentoIRRF, todosFeriados)) {
      const vencimentoAjustado = this.ajustarParaUltimoDiaUtilAnterior(vencimentoIRRF, todosFeriados);
      obrigacoes.push({
        data: vencimentoAjustado.format('YYYY-MM-DD'),
        tipo: 'irrf',
        descricao: 'IRRF - Imposto de Renda Retido na Fonte',
        observacao: `Competência: ${competencia.format('MM/YYYY')}. Vencimento original: ${vencimentoIRRF.format('DD/MM/YYYY')} (ajustado para ${vencimentoAjustado.format('DD/MM/YYYY')} por ser ${vencimentoIRRF.day() === 0 ? 'domingo' : vencimentoIRRF.day() === 6 ? 'sábado' : 'feriado'})`
      });
    } else {
      obrigacoes.push({
        data: vencimentoIRRF.format('YYYY-MM-DD'),
        tipo: 'irrf',
        descricao: 'IRRF - Imposto de Renda Retido na Fonte',
        observacao: `Competência: ${competencia.format('MM/YYYY')}`
      });
    }

    // ============================================
    // 4. DCTFWeb - Empresas/Equiparadas
    // ============================================
    // CORREÇÃO: DCTFWeb é referente ao mês ANTERIOR (mesmo que FGTS, INSS, IRRF)
    // REGRA: último dia útil do mês seguinte à competência
    // Exemplo: Se competência é 01/2025, DCTFWeb vence no último dia útil de 02/2025
    const ultimoDiaUtil = this.calcularUltimoDiaUtilMes(mesSeguinte.year(), mesSeguinte.month() + 1, todosFeriados);
    obrigacoes.push({
      data: ultimoDiaUtil.format('YYYY-MM-DD'),
      tipo: 'dctfweb',
      descricao: 'DCTFWeb - Empresas/Equiparadas',
      observacao: `Competência: ${competencia.format('MM/YYYY')}. Último dia útil do mês seguinte (${mesSeguinte.format('MM/YYYY')}).`
    });

    // ============================================
    // 5. EFD-Reinf - Empresas/Equiparadas
    // ============================================
    // REGRA: dia 15 do mês seguinte à competência
    // Exemplo: Se competência é 01/2025, EFD-Reinf vence dia 15/02/2025
    const vencimentoReinf = moment(`${mesSeguinte.year()}-${String(mesSeguinte.month() + 1).padStart(2, '0')}-15`);
    
    if (!this.isDiaUtil(vencimentoReinf, todosFeriados)) {
      // Se não for dia útil, adia para o primeiro dia útil subsequente
      const vencimentoAjustado = this.ajustarParaPrimeiroDiaUtilSubsequente(vencimentoReinf, todosFeriados);
      obrigacoes.push({
        data: vencimentoAjustado.format('YYYY-MM-DD'),
        tipo: 'efd_reinf',
        descricao: 'EFD-Reinf - Empresas/Equiparadas',
        observacao: `Competência: ${competencia.format('MM/YYYY')}. Vencimento original: ${vencimentoReinf.format('DD/MM/YYYY')} (ajustado para ${vencimentoAjustado.format('DD/MM/YYYY')} por ser ${vencimentoReinf.day() === 0 ? 'domingo' : vencimentoReinf.day() === 6 ? 'sábado' : 'feriado'})`
      });
    } else {
      obrigacoes.push({
        data: vencimentoReinf.format('YYYY-MM-DD'),
        tipo: 'efd_reinf',
        descricao: 'EFD-Reinf - Empresas/Equiparadas',
        observacao: `Competência: ${competencia.format('MM/YYYY')}`
      });
    }

    // ============================================
    // SALVA AS OBRIGAÇÕES NO BANCO DE DADOS
    // ============================================
    // CORREÇÃO: Verifica se já existem obrigações antes de criar novas
    // Evita duplicatas e remoções desnecessárias
    const competenciaStr = competencia.format('MM/YYYY');
    
    // Verifica se já existem obrigações automáticas para esta competência
    const obrigacoesExistentesResult = await db.query(
      `SELECT id, tipo, data FROM calendario_obrigacoes 
       WHERE user_id = $1 
       AND tipo IN ('fgts', 'inss', 'irrf', 'dctfweb', 'efd_reinf')
       AND observacao LIKE $2`,
      [userId, `%Competência: ${competenciaStr}%`]
    );
    
    const obrigacoesExistentes = obrigacoesExistentesResult.rows || [];
    
    // Se já existem obrigações para esta competência, verifica se precisa recriar
    if (obrigacoesExistentes.length > 0) {
      // Verifica se as datas estão corretas (pode ter mudado por ajuste de feriados)
      const tiposExistentes = new Set(obrigacoesExistentes.map(o => o.tipo));
      const tiposNecessarios = new Set(obrigacoes.map(o => o.tipo));
      
      // Se todos os tipos necessários já existem, não faz nada
      if (tiposExistentes.size === tiposNecessarios.size && 
          [...tiposNecessarios].every(t => tiposExistentes.has(t))) {
        return obrigacoesExistentes; // Retorna as existentes
      }
      
      // Se faltam tipos ou datas mudaram, remove apenas as que precisam ser recriadas
      const tiposParaRemover = [...tiposNecessarios].filter(t => !tiposExistentes.has(t));
      if (tiposParaRemover.length > 0) {
        await db.query(
          `DELETE FROM calendario_obrigacoes 
           WHERE user_id = $1 
           AND tipo = ANY($2)
           AND observacao LIKE $3`,
          [userId, tiposParaRemover, `%Competência: ${competenciaStr}%`]
        );
      }
    }

    // Agora cria todas as obrigações corretas (apenas as que não existem)
    const obrigacoesCriadas = [];
    const obrigacoesExistentesMap = new Map(
      obrigacoesExistentes.map(o => [`${o.tipo}-${o.data}`, o])
    );
    
    for (const obrigacao of obrigacoes) {
      try {
        // Verifica se já existe obrigação do mesmo tipo na mesma data
        const key = `${obrigacao.tipo}-${obrigacao.data}`;
        if (obrigacoesExistentesMap.has(key)) {
          // Já existe, não cria novamente
          obrigacoesCriadas.push(obrigacoesExistentesMap.get(key));
          continue;
        }
        
        // Cria a obrigação apenas se não existir
        const resultado = await this.saveObrigacao(
          userId,
          obrigacao.data,
          obrigacao.tipo,
          obrigacao.descricao,
          obrigacao.observacao
        );
        obrigacoesCriadas.push(resultado);
      } catch (error) {
        // Se der erro ao salvar uma obrigação específica, registra mas continua com as outras
        console.error(`Erro ao salvar obrigação ${obrigacao.tipo} para ${obrigacao.data}:`, error);
      }
    }

    // Retorna as obrigações criadas
    return obrigacoesCriadas;
  }
}

module.exports = CalendarioService;

