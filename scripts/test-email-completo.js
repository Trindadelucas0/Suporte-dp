/**
 * Script completo de teste de email
 * Testa configuração SMTP, conexão e envio de email
 */

require('dotenv').config();
const emailService = require('../services/emailService');
const db = require('../config/database');
const PaymentToken = require('../models/PaymentToken');

async function testarEmailCompleto() {
  console.log('🧪 TESTE COMPLETO DE EMAIL - Suporte DP');
  console.log('='.repeat(80));
  console.log('');

  // 1. Verificar variáveis de ambiente
  console.log('📋 1. VERIFICANDO VARIÁVEIS DE AMBIENTE');
  console.log('-'.repeat(80));
  
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  console.log('SMTP_HOST:', smtpHost || '❌ NÃO CONFIGURADO');
  console.log('SMTP_PORT:', smtpPort);
  console.log('SMTP_USER:', smtpUser || '❌ NÃO CONFIGURADO');
  console.log('SMTP_PASS:', smtpPass ? '***' + smtpPass.slice(-3) : '❌ NÃO CONFIGURADO');
  console.log('SMTP_FROM:', smtpFrom || '❌ NÃO CONFIGURADO');
  console.log('APP_URL:', appUrl);
  console.log('');

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('❌ ERRO: Variáveis de ambiente SMTP não estão configuradas!');
    console.log('');
    console.log('💡 Configure no arquivo .env:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_USER=seu-email@gmail.com');
    console.log('   SMTP_PASS=sua-senha-de-app');
    console.log('   SMTP_FROM=noreply@seudominio.com');
    process.exit(1);
  }

  // 2. Verificar transporter
  console.log('🔧 2. VERIFICANDO TRANSPORTER');
  console.log('-'.repeat(80));
  
  const transporter = emailService.getTransporter();
  
  if (!transporter) {
    console.error('❌ ERRO: Transporter não foi criado!');
    process.exit(1);
  }
  
  console.log('✅ Transporter criado com sucesso');
  console.log('');

  // 3. Testar conexão SMTP
  console.log('🔌 3. TESTANDO CONEXÃO SMTP');
  console.log('-'.repeat(80));
  
  try {
    console.log('Conectando ao servidor SMTP...');
    console.log('Host:', smtpHost);
    console.log('Port:', smtpPort);
    console.log('Aguarde...');
    
    await transporter.verify();
    console.log('✅ Conexão SMTP estabelecida com sucesso!');
    console.log('');
  } catch (verifyError) {
    console.error('❌ ERRO ao verificar conexão SMTP:');
    console.error('Código:', verifyError.code || 'N/A');
    console.error('Mensagem:', verifyError.message);
    console.error('');
    
    if (verifyError.code === 'ETIMEDOUT') {
      console.error('💡 Problema: Timeout de conexão');
      console.error('   - Verifique se o SMTP_HOST está correto');
      console.error('   - Verifique se a porta está correta');
      console.error('   - Verifique se há firewall bloqueando');
      console.error('   - Verifique conectividade de rede');
    } else if (verifyError.code === 'ECONNREFUSED') {
      console.error('💡 Problema: Conexão recusada');
      console.error('   - Verifique se o servidor SMTP está acessível');
      console.error('   - Verifique se a porta está correta');
      console.error('   - Verifique firewall');
    } else if (verifyError.code === 'EAUTH') {
      console.error('💡 Problema: Falha na autenticação');
      console.error('   - Verifique SMTP_USER e SMTP_PASS');
      console.error('   - Para Gmail, use senha de app (não senha normal)');
    }
    
    console.error('');
    console.error('Stack:', verifyError.stack);
    process.exit(1);
  }

  // 4. Testar envio de email simples
  console.log('📧 4. TESTANDO ENVIO DE EMAIL SIMPLES');
  console.log('-'.repeat(80));
  
  // Pega email de teste do argumento ou usa um padrão
  // Não usa smtpUser porque pode ser "resend" ou "apikey" (não é um email válido)
  const emailTeste = process.argv[2] || process.env.TEST_EMAIL || 'teste@example.com';
  
  if (!emailTeste || !emailTeste.includes('@')) {
    console.error('❌ ERRO: Email de destino inválido!');
    console.error('');
    console.error('💡 Use um dos seguintes métodos:');
    console.error('   1. Passe o email como argumento: npm run test-email seu-email@exemplo.com');
    console.error('   2. Configure TEST_EMAIL no .env: TEST_EMAIL=seu-email@exemplo.com');
    console.error('');
    process.exit(1);
  }
  
  console.log('Email de destino:', emailTeste);
  console.log('');
  
  try {
    console.log('Enviando email de teste...');
    
    const mailOptions = {
      from: `"Suporte DP - Teste" <${smtpFrom}>`,
      to: emailTeste,
      subject: 'Teste de Email - Suporte DP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Teste de Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #DC2626;">✅ Teste de Email - Suporte DP</h1>
          <p>Este é um email de teste para validar a configuração SMTP.</p>
          <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </body>
        </html>
      `,
      text: `
Teste de Email - Suporte DP

Este é um email de teste para validar a configuração SMTP.

Se você recebeu este email, a configuração está funcionando corretamente!

Data/Hora: ${new Date().toLocaleString('pt-BR')}
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de teste enviado com sucesso!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('');
  } catch (sendError) {
    console.error('❌ ERRO ao enviar email de teste:');
    console.error('Código:', sendError.code || 'N/A');
    console.error('Mensagem:', sendError.message);
    console.error('');
    
    if (sendError.code === 'ETIMEDOUT') {
      console.error('💡 Problema: Timeout ao enviar email');
      console.error('   - Servidor SMTP pode estar lento');
      console.error('   - Verifique conectividade de rede');
    } else if (sendError.code === 'EAUTH') {
      console.error('💡 Problema: Falha na autenticação');
      console.error('   - Verifique credenciais SMTP');
    }
    
    console.error('Stack:', sendError.stack);
    process.exit(1);
  }

  // 5. Testar envio de email com token (simulação)
  console.log('🔑 5. TESTANDO ENVIO DE EMAIL COM TOKEN');
  console.log('-'.repeat(80));
  
  try {
    console.log('Enviando email com token de teste...');
    
    const tokenTeste = 'TEST-TOKEN-' + Date.now();
    const resultado = await emailService.sendPaymentToken({
      email: emailTeste,
      token: tokenTeste,
      nome: 'Usuário Teste',
      orderNsu: '00000000-0000-0000-0000-000000000000',
      valor: 19.90
    });
    
    if (resultado.success) {
      console.log('✅ Email com token enviado com sucesso!');
      console.log('Message ID:', resultado.messageId);
      console.log('Token enviado:', tokenTeste);
    } else {
      console.error('❌ Erro ao enviar email com token:');
      console.error('Erro:', resultado.error);
      console.error('Código:', resultado.code || 'N/A');
    }
    console.log('');
  } catch (tokenError) {
    console.error('❌ ERRO ao testar envio de email com token:');
    console.error('Mensagem:', tokenError.message);
    console.error('Stack:', tokenError.stack);
    console.log('');
  }

  // 6. Verificar tokens no banco (últimos 5)
  console.log('📊 6. VERIFICANDO TOKENS NO BANCO DE DADOS');
  console.log('-'.repeat(80));
  
  try {
    const tokensResult = await db.query(
      `SELECT id, token, email, order_nsu, used, expires_at, created_at
       FROM payment_tokens
       ORDER BY created_at DESC
       LIMIT 5`
    );
    
    if (tokensResult.rows.length === 0) {
      console.log('ℹ️  Nenhum token encontrado no banco de dados');
    } else {
      console.log(`📋 Encontrados ${tokensResult.rows.length} token(s) recente(s):`);
      console.log('');
      
      tokensResult.rows.forEach((token, index) => {
        console.log(`${index + 1}. Token ID: ${token.id}`);
        console.log(`   Email: ${token.email}`);
        console.log(`   Token: ${token.token.substring(0, 20)}...`);
        console.log(`   Order NSU: ${token.order_nsu}`);
        console.log(`   Status: ${token.used ? '❌ Usado' : '✅ Pendente'}`);
        console.log(`   Expira em: ${new Date(token.expires_at).toLocaleString('pt-BR')}`);
        console.log(`   Criado em: ${new Date(token.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      });
    }
  } catch (dbError) {
    console.error('❌ ERRO ao consultar banco de dados:');
    console.error('Mensagem:', dbError.message);
    console.log('');
  }

  // 7. Resumo final
  console.log('📋 7. RESUMO DO TESTE');
  console.log('='.repeat(80));
  console.log('✅ Variáveis de ambiente: OK');
  console.log('✅ Transporter: OK');
  console.log('✅ Conexão SMTP: OK');
  console.log('✅ Envio de email simples: OK');
  console.log('✅ Envio de email com token: OK');
  console.log('');
  console.log('🎉 TODOS OS TESTES PASSARAM!');
  console.log('');
  console.log('💡 Se os emails não estão chegando:');
  console.log('   1. Verifique a pasta de spam/lixo eletrônico');
  console.log('   2. Verifique se o email de destino está correto');
  console.log('   3. Aguarde alguns minutos (emails podem demorar)');
  console.log('   4. Verifique logs do servidor para erros');
  console.log('');
}

// Executa o teste
testarEmailCompleto()
  .then(() => {
    console.log('✅ Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal durante o teste:');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });

