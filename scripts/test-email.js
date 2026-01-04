/**
 * SCRIPT: Teste de Envio de Email
 * Testa se o serviço de email está configurado e funcionando
 * 
 * Executar: node scripts/test-email.js
 */

require('dotenv').config();
const emailService = require('../services/emailService');

async function testEmail() {
  console.log('🔍 Testando serviço de email...\n');
  
  // Verifica configuração
  console.log('1️⃣ Verificando configuração SMTP...');
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS ? '***' : '(não configurado)';
  const smtpFrom = process.env.SMTP_FROM || smtpUser || '(não configurado)';

  console.log('   Configuração:');
  console.log(`   SMTP_HOST: ${smtpHost || '(não configurado)'}`);
  console.log(`   SMTP_PORT: ${smtpPort}`);
  console.log(`   SMTP_USER: ${smtpUser || '(não configurado)'}`);
  console.log(`   SMTP_PASS: ${smtpPass}`);
  console.log(`   SMTP_FROM: ${smtpFrom}\n`);

  if (!smtpHost || !smtpUser || !process.env.SMTP_PASS) {
    console.log('   ❌ SMTP não configurado completamente');
    console.log('   💡 Configure as variáveis no .env:');
    console.log('      SMTP_HOST=smtp.gmail.com');
    console.log('      SMTP_PORT=587');
    console.log('      SMTP_USER=seu-email@gmail.com');
    console.log('      SMTP_PASS=sua-senha-de-app');
    console.log('      SMTP_FROM=noreply@seudominio.com\n');
    return;
  }

  console.log('   ✅ Configuração SMTP encontrada\n');

  // Testa conexão com servidor SMTP
  console.log('2️⃣ Testando conexão com servidor SMTP...');
  try {
    const transporter = emailService.getTransporter();
    if (!transporter) {
      console.log('   ❌ Não foi possível criar transporter');
      return;
    }

    // Verifica conexão
    await transporter.verify();
    console.log('   ✅ Conexão com servidor SMTP estabelecida\n');
  } catch (error) {
    console.log('   ❌ Erro ao conectar com servidor SMTP:');
    console.log(`   ${error.message}\n`);
    
    if (error.code === 'EAUTH') {
      console.log('   💡 Erro de autenticação. Verifique:');
      console.log('      - Email e senha estão corretos');
      console.log('      - Para Gmail, use "Senha de app" (não a senha normal)');
      console.log('      - Verifique se a autenticação de dois fatores está ativada\n');
    }
    return;
  }

  // Testa envio de email
  console.log('3️⃣ Testando envio de email...');
  
  // Email de teste (use um email seu para testar)
  const testEmail = process.env.TEST_EMAIL || smtpUser;
  
  if (!testEmail) {
    console.log('   ⚠️  Configure TEST_EMAIL no .env ou use SMTP_USER');
    console.log('   💡 Exemplo: TEST_EMAIL=seu-email-teste@gmail.com\n');
    return;
  }

  try {
    const result = await emailService.sendPaymentConfirmation({
      email: testEmail,
      nome: 'Teste de Email',
      orderNsu: 'test-' + Date.now(),
      valor: 19.90,
      linkCadastro: process.env.APP_URL || 'http://localhost:3000/register'
    });

    if (result.success) {
      console.log('   ✅ Email enviado com sucesso!');
      console.log(`   📧 Para: ${testEmail}`);
      console.log(`   📝 Message ID: ${result.messageId}\n`);
      console.log('   💡 Verifique sua caixa de entrada (e spam)\n');
    } else {
      console.log('   ❌ Erro ao enviar email:');
      console.log(`   ${result.error}\n`);
    }
  } catch (error) {
    console.log('   ❌ Erro ao enviar email:');
    console.log(`   ${error.message}\n`);
    console.log('Stack:', error.stack);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  testEmail()
    .then(() => {
      console.log('✅ Teste de email concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar teste:', error);
      process.exit(1);
    });
}

module.exports = testEmail;

