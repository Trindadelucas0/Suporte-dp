/**
 * SCRIPT: Diagnóstico de Email
 * Verifica configuração e testa envio de email
 */

require('dotenv').config();
const { Resend } = require('resend');
const emailService = require('../services/emailService');

async function diagnosticarEmail() {
  console.log('\n🔍 DIAGNÓSTICO DE EMAIL - Suporte DP\n');
  console.log('='.repeat(60));
  
  // 1. Verificar configurações
  console.log('\n1️⃣ VERIFICANDO CONFIGURAÇÕES:\n');
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpFrom = process.env.SMTP_FROM;
  
  console.log(`RESEND_API_KEY: ${resendApiKey ? '✅ CONFIGURADO (' + resendApiKey.substring(0, 20) + '...)' : '❌ NÃO CONFIGURADO'}`);
  console.log(`SMTP_FROM: ${smtpFrom ? '✅ CONFIGURADO (' + smtpFrom + ')' : '❌ NÃO CONFIGURADO'}`);
  
  if (!resendApiKey) {
    console.log('\n❌ ERRO: RESEND_API_KEY não configurado!');
    console.log('   💡 Configure no Render: Environment > Add Environment Variable');
    console.log('   💡 Obtenha a chave em: https://resend.com/api-keys');
    return;
  }
  
  if (!smtpFrom) {
    console.log('\n❌ ERRO: SMTP_FROM não configurado!');
    console.log('   💡 Configure no Render: Environment > Add Environment Variable');
    console.log('   💡 Use um email com domínio verificado no Resend');
    console.log('   💡 Exemplo: noreply@seudominio.com');
    return;
  }
  
  // 2. Validar formato do email remetente
  console.log('\n2️⃣ VALIDANDO EMAIL REMETENTE:\n');
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(smtpFrom)) {
    console.log(`❌ ERRO: SMTP_FROM inválido: ${smtpFrom}`);
    console.log('   💡 Use formato: email@dominio.com');
    return;
  }
  
  const dominio = smtpFrom.split('@')[1];
  console.log(`✅ Email remetente válido: ${smtpFrom}`);
  console.log(`✅ Domínio: ${dominio}`);
  console.log(`⚠️  IMPORTANTE: O domínio ${dominio} deve estar verificado no Resend`);
  console.log('   💡 Verifique em: https://resend.com/domains');
  
  // 3. Testar conexão com Resend
  console.log('\n3️⃣ TESTANDO CONEXÃO COM RESEND:\n');
  
  try {
    const resend = new Resend(resendApiKey);
    console.log('✅ Cliente Resend inicializado');
    
    // Tentar listar domínios (para verificar se a API key está válida)
    try {
      const domains = await resend.domains.list();
      console.log('✅ API Key válida - Conectado ao Resend');
      console.log(`   📋 Domínios verificados: ${domains.data?.data?.length || 0}`);
      
      if (domains.data?.data && domains.data.data.length > 0) {
        console.log('\n   Domínios encontrados:');
        domains.data.data.forEach(domain => {
          const isVerified = domain.status === 'verified';
          const isCurrentDomain = domain.name === dominio;
          console.log(`   ${isVerified ? '✅' : '❌'} ${domain.name} - ${domain.status} ${isCurrentDomain ? '← SEU DOMÍNIO' : ''}`);
        });
        
        const dominioEncontrado = domains.data.data.find(d => d.name === dominio);
        if (!dominioEncontrado) {
          console.log(`\n⚠️  ATENÇÃO: Domínio ${dominio} não encontrado na sua conta Resend!`);
          console.log('   💡 Você precisa adicionar e verificar este domínio no Resend');
          console.log('   💡 Acesse: https://resend.com/domains');
        } else if (dominioEncontrado.status !== 'verified') {
          console.log(`\n⚠️  ATENÇÃO: Domínio ${dominio} não está verificado!`);
          console.log(`   Status: ${dominioEncontrado.status}`);
          console.log('   💡 Você precisa verificar este domínio no Resend');
          console.log('   💡 Acesse: https://resend.com/domains');
        } else {
          console.log(`\n✅ Domínio ${dominio} está verificado!`);
        }
      } else {
        console.log('\n⚠️  Nenhum domínio encontrado na sua conta Resend');
        console.log('   💡 Você precisa adicionar e verificar um domínio');
        console.log('   💡 Acesse: https://resend.com/domains');
      }
    } catch (domainError) {
      console.log('⚠️  Não foi possível listar domínios (pode ser limitação da API)');
      console.log('   Mas a API Key parece estar funcionando');
    }
  } catch (error) {
    console.log('❌ ERRO ao conectar com Resend:', error.message);
    return;
  }
  
  // 4. Testar envio de email (se email de teste fornecido)
  const emailTeste = process.argv[2];
  if (emailTeste) {
    console.log('\n4️⃣ TESTANDO ENVIO DE EMAIL:\n');
    console.log(`📧 Email de teste: ${emailTeste}`);
    
    try {
      const resultado = await emailService.sendPaymentToken({
        email: emailTeste,
        token: 'test-token-' + Date.now(),
        nome: 'Teste',
        orderNsu: 'test-order-' + Date.now(),
        valor: 19.90
      });
      
      if (resultado.success) {
        console.log('\n✅ Email de teste enviado com sucesso!');
        console.log(`   📬 Message ID: ${resultado.messageId}`);
        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('   1. Verifique a caixa de entrada do email');
        console.log('   2. Verifique a pasta de spam/lixo eletrônico');
        console.log('   3. Verifique os logs no painel do Resend');
        console.log('   4. Se não chegou, verifique se o domínio está verificado');
      } else {
        console.log('\n❌ Erro ao enviar email de teste:', resultado.error);
      }
    } catch (error) {
      console.log('\n❌ Erro ao enviar email de teste:', error.message);
    }
  } else {
    console.log('\n4️⃣ TESTE DE ENVIO:\n');
    console.log('💡 Para testar o envio, execute:');
    console.log(`   node scripts/diagnostico-email.js seu-email@exemplo.com`);
  }
  
  // 5. Resumo e recomendações
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 RESUMO E RECOMENDAÇÕES:\n');
  
  console.log('✅ Verificações realizadas:');
  console.log('   - Configuração de variáveis de ambiente');
  console.log('   - Formato do email remetente');
  console.log('   - Conexão com API do Resend');
  console.log('   - Status dos domínios verificados');
  
  console.log('\n💡 SE OS EMAILS NÃO ESTÃO CHEGANDO:\n');
  console.log('   1. Verifique se o domínio está verificado no Resend');
  console.log('      → https://resend.com/domains');
  console.log('   2. Verifique os logs no painel do Resend');
  console.log('      → https://resend.com/emails');
  console.log('   3. Verifique a caixa de spam do destinatário');
  console.log('   4. Verifique se o email do destinatário está correto');
  console.log('   5. Alguns provedores (Gmail, Outlook) podem demorar alguns minutos');
  console.log('   6. Verifique se há bloqueios no provedor do destinatário');
  
  console.log('\n🔧 CONFIGURAÇÕES RECOMENDADAS:\n');
  console.log('   - Use um domínio próprio verificado no Resend');
  console.log('   - Configure SPF, DKIM e DMARC no seu domínio');
  console.log('   - Use um email profissional (noreply@seudominio.com)');
  console.log('   - Evite usar emails de provedores gratuitos como remetente');
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Executa diagnóstico
diagnosticarEmail().catch(error => {
  console.error('\n❌ Erro no diagnóstico:', error);
  process.exit(1);
});

