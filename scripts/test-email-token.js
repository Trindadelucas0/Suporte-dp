/**
 * Script de teste para verificar envio de email com token
 */

require('dotenv').config();
const emailService = require('../services/emailService');

async function testarEnvioEmail() {
  console.log('🧪 Testando envio de email com token...\n');
  
  const emailTeste = process.argv[2] || 'teste@example.com';
  
  console.log('📧 Email de destino:', emailTeste);
  console.log('📋 Verificando configuração SMTP...\n');
  
  const transporter = emailService.getTransporter();
  
  if (!transporter) {
    console.error('❌ SMTP não configurado!');
    console.log('\n💡 Configure as variáveis de ambiente:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_USER=seu-email@gmail.com');
    console.log('   SMTP_PASS=sua-senha-de-app');
    process.exit(1);
  }
  
  try {
    console.log('✅ Transporter configurado');
    console.log('🔍 Verificando conexão SMTP...');
    
    await transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso\n');
    
    console.log('📨 Enviando email de teste com token...');
    
    const resultado = await emailService.sendPaymentToken({
      email: emailTeste,
      token: 'TEST-TOKEN-12345-67890-ABCDE-FGHIJ',
      nome: 'Usuário Teste',
      orderNsu: '00000000-0000-0000-0000-000000000000',
      valor: 19.90
    });
    
    if (resultado.success) {
      console.log('✅ Email enviado com sucesso!');
      console.log('📬 Message ID:', resultado.messageId);
      console.log('\n💡 Verifique a caixa de entrada (e spam) do email:', emailTeste);
    } else {
      console.error('❌ Erro ao enviar email:', resultado.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar envio de email:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testarEnvioEmail();

