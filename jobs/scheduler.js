/**
 * SCHEDULER: Jobs Automatizados
 * Gerencia tarefas agendadas com node-cron
 */

const cron = require('node-cron');
const cobrancaService = require('../services/cobrancaService');
const lembreteService = require('../services/lembreteService');
const bloqueioService = require('../services/bloqueioService');

class Scheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Inicializa todos os jobs
   */
  init() {
    console.log('🔄 Inicializando scheduler de cobrança...');

    // Job 1: Gerar cobranças mensais (dia 1 de cada mês às 00:00)
    const jobCobrancas = cron.schedule('0 0 1 * *', async () => {
      console.log('📅 Executando job: Gerar cobranças mensais');
      try {
        await cobrancaService.gerarCobrancasMensais();
      } catch (error) {
        console.error('❌ Erro ao gerar cobranças mensais:', error);
      }
    }, {
      scheduled: true, // ATIVADO - gera cobranças automaticamente
      timezone: 'America/Sao_Paulo'
    });

    // Job 2: Enviar lembretes (diariamente às 09:00)
    const jobLembretes = cron.schedule('0 9 * * *', async () => {
      console.log('📅 Executando job: Enviar lembretes');
      try {
        await lembreteService.enviarLembretesPreVencimento();
        await lembreteService.enviarAvisosAtraso();
      } catch (error) {
        console.error('❌ Erro ao enviar lembretes:', error);
      }
    }, {
      scheduled: true, // ATIVADO - envia lembretes automaticamente
      timezone: 'America/Sao_Paulo'
    });

    // Job 3: Verificar e bloquear usuários (diariamente às 10:00)
    const jobBloqueio = cron.schedule('0 10 * * *', async () => {
      console.log('📅 Executando job: Verificar bloqueios');
      try {
        await bloqueioService.verificarEBloquearUsuarios();
      } catch (error) {
        console.error('❌ Erro ao verificar bloqueios:', error);
      }
    }, {
      scheduled: true, // ATIVADO - bloqueia automaticamente
      timezone: 'America/Sao_Paulo'
    });

    // Job 4: Marcar cobranças vencidas (diariamente às 08:00)
    const jobVencidas = cron.schedule('0 8 * * *', async () => {
      console.log('📅 Executando job: Marcar cobranças vencidas');
      try {
        const Cobranca = require('../models/Cobranca');
        const hoje = new Date().toISOString().split('T')[0];
        const cobrancasVencidas = await Cobranca.findOverdue(hoje);
        
        for (const cobranca of cobrancasVencidas) {
          await Cobranca.markAsOverdue(cobranca.id);
        }
        console.log(`✅ ${cobrancasVencidas.length} cobranças marcadas como vencidas`);
      } catch (error) {
        console.error('❌ Erro ao marcar cobranças vencidas:', error);
      }
    }, {
      scheduled: true, // ATIVADO - marca vencidas automaticamente
      timezone: 'America/Sao_Paulo'
    });

    // Armazena referências dos jobs
    this.jobs = [
      { name: 'cobrancas', job: jobCobrancas },
      { name: 'lembretes', job: jobLembretes },
      { name: 'bloqueio', job: jobBloqueio },
      { name: 'vencidas', job: jobVencidas }
    ];

    // Inicia todos os jobs
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`✅ Job "${name}" iniciado`);
    });

    console.log('✅ Scheduler inicializado com sucesso');
  }

  /**
   * Para todos os jobs
   */
  stop() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`⏹️  Job "${name}" parado`);
    });
  }

  /**
   * Executa job manualmente (para testes)
   */
  async runJob(jobName) {
    const job = this.jobs.find(j => j.name === jobName);
    if (!job) {
      throw new Error(`Job "${jobName}" não encontrado`);
    }

    console.log(`🔄 Executando job "${jobName}" manualmente...`);

    switch (jobName) {
      case 'cobrancas':
        return await cobrancaService.gerarCobrancasMensais();
      case 'lembretes':
        await lembreteService.enviarLembretesPreVencimento();
        return await lembreteService.enviarAvisosAtraso();
      case 'bloqueio':
        return await bloqueioService.verificarEBloquearUsuarios();
      default:
        throw new Error(`Job "${jobName}" não implementado`);
    }
  }
}

module.exports = new Scheduler();

