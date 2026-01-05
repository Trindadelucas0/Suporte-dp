/**
 * SCRIPT: Diagnóstico do Fluxo de Pagamento
 * Valida todo o fluxo de pagamento e identifica problemas
 * 
 * Executar:
 * node scripts/diagnostico-fluxo-pagamento.js
 * 
 * Ou para um usuário específico:
 * node scripts/diagnostico-fluxo-pagamento.js inovateanuncio@gmail.com
 */

require('dotenv').config();
const db = require('../config/database');
const Payment = require('../models/Payment');
const PaymentToken = require('../models/PaymentToken');
const Order = require('../models/Order');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Importa função de gerar tokens
const gerarTokensScript = require('./gerar-tokens-para-usuarios');

async function diagnosticarFluxo(emailFiltro = null) {
  try {
    console.log('🔍 INICIANDO DIAGNÓSTICO DO FLUXO DE PAGAMENTO\n');
    console.log('='.repeat(80));
    
    // 1. VERIFICAR CONFIGURAÇÃO SMTP
    console.log('\n📧 1. VERIFICANDO CONFIGURAÇÃO DE EMAIL (SMTP)');
    console.log('-'.repeat(80));
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS ? '***configurado***' : '❌ NÃO CONFIGURADO';
    
    console.log(`SMTP_HOST: ${smtpHost || '❌ NÃO CONFIGURADO'}`);
    console.log(`SMTP_USER: ${smtpUser || '❌ NÃO CONFIGURADO'}`);
    console.log(`SMTP_PASS: ${smtpPass}`);
    
    if (!smtpHost || !smtpUser || !process.env.SMTP_PASS) {
      console.log('⚠️  PROBLEMA: SMTP não está configurado! Emails não serão enviados.');
      console.log('💡 Configure SMTP_HOST, SMTP_USER e SMTP_PASS no .env');
    } else {
      console.log('✅ SMTP configurado');
      
      // Testa envio de email (teste básico - não envia email real)
      try {
        const transporter = emailService.getTransporter();
        if (transporter) {
          console.log('✅ Transporter de email inicializado com sucesso');
          
          // Testa se consegue criar um email de teste (sem enviar)
          try {
            await transporter.verify();
            console.log('✅ Conexão SMTP verificada com sucesso');
          } catch (verifyError) {
            console.log(`⚠️  Erro ao verificar conexão SMTP: ${verifyError.message}`);
            console.log('   💡 Verifique as credenciais SMTP no .env');
          }
        } else {
          console.log('❌ Erro ao inicializar transporter de email');
        }
      } catch (emailError) {
        console.log(`❌ Erro ao testar email: ${emailError.message}`);
      }
    }
    
    // 2. BUSCAR PAGAMENTOS CONFIRMADOS
    console.log('\n💳 2. VERIFICANDO PAGAMENTOS CONFIRMADOS');
    console.log('-'.repeat(80));
    
    let paymentsQuery = `
      SELECT DISTINCT ON (p.order_nsu)
        p.id,
        p.order_nsu,
        p.user_id,
        p.transaction_nsu,
        p.paid_amount,
        p.status,
        p.paid_at,
        o.customer_email,
        o.user_id as order_user_id,
        u.email as user_email,
        u.nome as user_nome,
        u.subscription_status,
        u.subscription_expires_at
      FROM payments p
      LEFT JOIN orders o ON p.order_nsu = o.order_nsu
      LEFT JOIN users u ON COALESCE(p.user_id, o.user_id) = u.id
      WHERE p.status = 'paid'
    `;
    
    const params = [];
    if (emailFiltro) {
      paymentsQuery += ` AND (o.customer_email = $1 OR u.email = $1)`;
      params.push(emailFiltro.toLowerCase());
    }
    
    paymentsQuery += ` ORDER BY p.order_nsu, p.paid_at DESC`;
    
    const paymentsResult = await db.query(paymentsQuery, params);
    const payments = paymentsResult.rows;
    
    console.log(`📊 Total de pagamentos confirmados: ${payments.length}`);
    
    if (payments.length === 0) {
      console.log('⚠️  Nenhum pagamento confirmado encontrado.');
      if (emailFiltro) {
        console.log(`💡 Verifique se o email ${emailFiltro} tem pagamentos confirmados.`);
      }
      // Só encerra o processo se executado diretamente (não quando importado como módulo)
      if (require.main === module) {
        process.exit(0);
      }
      return; // Retorna sem encerrar se chamado como módulo
    }
    
    console.log('\n📋 Lista de pagamentos confirmados:');
    payments.forEach((p, index) => {
      console.log(`\n${index + 1}. Pagamento ID: ${p.id}`);
      console.log(`   Order NSU: ${p.order_nsu}`);
      console.log(`   Transaction NSU: ${p.transaction_nsu}`);
      console.log(`   Valor pago: R$ ${(p.paid_amount / 100).toFixed(2)}`);
      console.log(`   Data pagamento: ${p.paid_at ? new Date(p.paid_at).toLocaleString('pt-BR') : 'N/A'}`);
      console.log(`   Email (order): ${p.customer_email || 'N/A'}`);
      console.log(`   User ID (payment): ${p.user_id || 'N/A'}`);
      console.log(`   User ID (order): ${p.order_user_id || 'N/A'}`);
      console.log(`   Email (usuário): ${p.user_email || 'N/A'}`);
      console.log(`   Nome (usuário): ${p.user_nome || 'N/A'}`);
      console.log(`   Subscription Status: ${p.subscription_status || '❌ undefined/null'}`);
      console.log(`   Subscription Expires: ${p.subscription_expires_at || '❌ undefined/null'}`);
    });
    
    // 3. VERIFICAR TOKENS
    console.log('\n🔑 3. VERIFICANDO TOKENS DE VALIDAÇÃO');
    console.log('-'.repeat(80));
    
    let tokensSemValidacao = 0;
    let tokensExpirados = 0;
    let tokensUsados = 0;
    let tokensValidos = 0;
    
    for (const payment of payments) {
      const email = payment.user_email || payment.customer_email;
      if (!email) {
        console.log(`⚠️  Pagamento ${payment.order_nsu} sem email - pulando verificação de token`);
        continue;
      }
      
      console.log(`\n📧 Email: ${email}`);
      console.log(`   Order NSU: ${payment.order_nsu}`);
      
      // Buscar todos os tokens para este order_nsu
      const tokens = await PaymentToken.findByOrderNsu(payment.order_nsu);
      
      if (tokens.length === 0) {
        console.log(`   ❌ NENHUM TOKEN ENCONTRADO para este pagamento!`);
        tokensSemValidacao++;
      } else {
        console.log(`   📋 Tokens encontrados: ${tokens.length}`);
        
        tokens.forEach((token, idx) => {
          const now = new Date();
          const expiresAt = new Date(token.expires_at);
          const isExpired = expiresAt < now;
          const isValid = !token.used && !isExpired;
          
          console.log(`\n   Token ${idx + 1}:`);
          console.log(`      Token: ${token.token}`);
          console.log(`      Criado em: ${new Date(token.created_at).toLocaleString('pt-BR')}`);
          console.log(`      Expira em: ${expiresAt.toLocaleString('pt-BR')}`);
          console.log(`      Status: ${token.used ? '❌ USADO' : (isExpired ? '⏰ EXPIRADO' : '✅ VÁLIDO')}`);
          console.log(`      Usado em: ${token.used_at ? new Date(token.used_at).toLocaleString('pt-BR') : 'N/A'}`);
          
          if (token.used) {
            tokensUsados++;
          } else if (isExpired) {
            tokensExpirados++;
          } else {
            tokensValidos++;
          }
        });
        
        // Verificar se há token pendente válido
        const tokenPendente = await PaymentToken.findPendingTokenByEmail(email);
        if (tokenPendente) {
          console.log(`   ✅ Token pendente válido encontrado: ${tokenPendente.token}`);
        } else {
          console.log(`   ⚠️  Nenhum token pendente válido encontrado para este email`);
        }
      }
    }
    
    // 4. RESUMO E PROBLEMAS IDENTIFICADOS
    console.log('\n\n📊 4. RESUMO E DIAGNÓSTICO');
    console.log('='.repeat(80));
    
    console.log(`\n✅ Tokens válidos (não usados, não expirados): ${tokensValidos}`);
    console.log(`⏰ Tokens expirados: ${tokensExpirados}`);
    console.log(`❌ Tokens usados: ${tokensUsados}`);
    console.log(`⚠️  Pagamentos sem token: ${tokensSemValidacao}`);
    
    console.log('\n🔍 PROBLEMAS IDENTIFICADOS:');
    console.log('-'.repeat(80));
    
    let problemas = [];
    
    // Verificar cada pagamento
    for (const payment of payments) {
      const email = payment.user_email || payment.customer_email;
      if (!email) {
        problemas.push(`⚠️  Pagamento ${payment.order_nsu} sem email associado`);
        continue;
      }
      
      const tokens = await PaymentToken.findByOrderNsu(payment.order_nsu);
      const tokenPendente = await PaymentToken.findPendingTokenByEmail(email);
      
      // Problema 1: Pagamento confirmado mas sem token
      if (tokens.length === 0) {
        problemas.push(`❌ Pagamento ${payment.order_nsu} (${email}) confirmado mas SEM TOKEN gerado`);
        problemas.push(`   💡 SOLUÇÃO: Execute: node scripts/gerar-tokens-para-usuarios.js`);
      }
      
      // Problema 2: Pagamento confirmado mas token expirado/usado
      if (tokens.length > 0 && !tokenPendente) {
        const tokensValidosCount = tokens.filter(t => {
          const now = new Date();
          const expiresAt = new Date(t.expires_at);
          return !t.used && expiresAt > now;
        }).length;
        
        if (tokensValidosCount === 0) {
          problemas.push(`⏰ Pagamento ${payment.order_nsu} (${email}) tem tokens mas TODOS estão expirados/usados`);
          problemas.push(`   💡 SOLUÇÃO: Execute: node scripts/gerar-tokens-para-usuarios.js para gerar novo token`);
        }
      }
      
      // Problema 3: Pagamento confirmado mas subscription_status undefined
      if (payment.subscription_status === null || payment.subscription_status === undefined) {
        if (tokenPendente) {
          problemas.push(`🔐 Pagamento ${payment.order_nsu} (${email}) confirmado, tem token pendente mas subscription_status está undefined`);
          problemas.push(`   💡 SOLUÇÃO: Usuário precisa validar o token em /validar-pagamento`);
        } else {
          problemas.push(`⚠️  Pagamento ${payment.order_nsu} (${email}) confirmado mas subscription_status está undefined e SEM TOKEN`);
          problemas.push(`   💡 SOLUÇÃO: Execute: node scripts/gerar-tokens-para-usuarios.js`);
        }
      }
    }
    
    if (problemas.length === 0) {
      console.log('✅ Nenhum problema identificado! O fluxo está funcionando corretamente.');
    } else {
      problemas.forEach(problema => console.log(problema));
    }
    
    // 5. VERIFICAR CONFIGURAÇÃO DO WEBHOOK
    console.log('\n\n🔔 5. VERIFICANDO CONFIGURAÇÃO DO WEBHOOK');
    console.log('-'.repeat(80));
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    console.log(`APP_URL: ${appUrl}`);
    console.log(`Webhook URL: ${appUrl}/webhook/infinitepay`);
    console.log(`Redirect URL: ${appUrl}/checkout/sucesso`);
    
    // 6. RECOMENDAÇÕES
    console.log('\n\n💡 6. RECOMENDAÇÕES');
    console.log('='.repeat(80));
    
    if (tokensSemValidacao > 0 || problemas.some(p => p.includes('SEM TOKEN'))) {
      console.log('\n✅ Execute o script para gerar tokens:');
      console.log('   node scripts/gerar-tokens-para-usuarios.js');
    }
    
    if (!smtpHost || !smtpUser || !process.env.SMTP_PASS) {
      console.log('\n✅ Configure o SMTP no .env:');
      console.log('   SMTP_HOST=smtp.gmail.com');
      console.log('   SMTP_PORT=587');
      console.log('   SMTP_USER=seu-email@gmail.com');
      console.log('   SMTP_PASS=sua-senha-de-app');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ DIAGNÓSTICO CONCLUÍDO\n');
    
    // Só encerra o processo se executado diretamente (não quando importado como módulo)
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    console.error('Stack:', error.stack);
    
    // Só encerra o processo se executado diretamente (não quando importado como módulo)
    if (require.main === module) {
      process.exit(1);
    }
    // Se chamado como módulo, relança o erro para ser tratado pelo chamador
    throw error;
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  const emailFiltro = process.argv[2] || null;
  diagnosticarFluxo(emailFiltro);
}

module.exports = { diagnosticarFluxo };

