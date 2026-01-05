/**
 * Script: Teste de Email ao Iniciar Servidor
 * 
 * Envia um email de teste quando o servidor inicia
 * para verificar se a configuração de email está funcionando
 */

const emailService = require('../services/emailService');

async function enviarEmailTesteInicio() {
  try {
    console.log('\n📧 [INICIO] Enviando email de teste ao iniciar servidor...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'lucasrodrigues4@live.com';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const dataHora = new Date().toLocaleString('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'long'
    });

    // Usa sendNewUserNotification para enviar email de teste
    const resultado = await emailService.sendNewUserNotification({
      nome: 'TESTE DE CAIXA DE ENTRADA',
      email: adminEmail,
      whatsapp: 'Sistema',
      subscription_status: 'teste',
      data_cadastro: dataHora
    });

    if (resultado.success) {
      console.log('✅ [INICIO] Email de teste enviado com sucesso!');
      console.log('   - Destinatário:', adminEmail);
      console.log('   - Assunto: TESTE DE CAIXA DE ENTRADA');
      console.log('   - Message ID:', resultado.messageId || 'N/A');
      console.log('   - Verifique sua caixa de entrada para confirmar que o email está funcionando!\n');
    } else {
      console.error('❌ [INICIO] Erro ao enviar email de teste:', resultado.error);
      console.error('   - Verifique as configurações SMTP no Render\n');
    }
  } catch (error) {
    console.error('❌ [INICIO] Erro ao enviar email de teste:', error.message);
    console.error('   - Stack:', error.stack);
    console.error('   - Verifique as configurações SMTP no Render\n');
  }
}

// Se executado diretamente, envia o email
if (require.main === module) {
  enviarEmailTesteInicio()
    .then(() => {
      console.log('✅ Script de teste de email concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script de teste de email:', error);
      process.exit(1);
    });
}

module.exports = enviarEmailTesteInicio;

