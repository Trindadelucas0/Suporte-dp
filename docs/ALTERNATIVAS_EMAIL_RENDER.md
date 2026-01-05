# 📧 Alternativas ao SendGrid para Render

## 🚀 Opções Recomendadas

### 1️⃣ **Resend** (RECOMENDADO - Mais Fácil)

**Por que escolher:**
- ✅ Interface muito simples
- ✅ 3.000 emails/mês grátis
- ✅ Setup em 5 minutos
- ✅ API muito fácil de usar
- ✅ Documentação excelente

**Setup:**
1. Acesse: **https://resend.com/**
2. Crie conta gratuita
3. Vá em **API Keys** > **Create API Key**
4. Copie a API Key (começa com `re_`)

**Configuração no Render:**
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_sua-api-key-aqui
SMTP_FROM=noreply@seudominio.com
```

**⚠️ IMPORTANTE:**
- `SMTP_USER` deve ser exatamente: `resend`
- `SMTP_PASS` é sua API Key do Resend
- Você precisa verificar um domínio OU usar o domínio de teste do Resend

**Limite gratuito:** 3.000 emails/mês

---

### 2️⃣ **Mailgun** (Muito Confiável)

**Por que escolher:**
- ✅ Muito confiável e estável
- ✅ 5.000 emails/mês grátis (primeiros 3 meses)
- ✅ Depois: 1.000 emails/mês grátis
- ✅ Excelente para produção

**Setup:**
1. Acesse: **https://www.mailgun.com/**
2. Crie conta gratuita
3. Vá em **Sending** > **Domain Settings**
4. Adicione e verifique seu domínio
5. Vá em **Settings** > **API Keys**
6. Copie a API Key (começa com `key-`)

**Configuração no Render:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seudominio.com
SMTP_PASS=sua-api-key-mailgun
SMTP_FROM=noreply@seudominio.com
```

**⚠️ IMPORTANTE:**
- `SMTP_USER` é `postmaster@seudominio.com` (domínio verificado)
- `SMTP_PASS` é sua API Key do Mailgun
- Você precisa verificar um domínio

**Limite gratuito:** 1.000 emails/mês (após 3 meses)

---

### 3️⃣ **Brevo** (Antigo Sendinblue)

**Por que escolher:**
- ✅ 300 emails/dia grátis (9.000/mês)
- ✅ Interface em português disponível
- ✅ Muito generoso no plano gratuito

**Setup:**
1. Acesse: **https://www.brevo.com/**
2. Crie conta gratuita
3. Vá em **Settings** > **SMTP & API**
4. Clique em **Generate new key**
5. Copie a API Key

**Configuração no Render:**
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=seu-email@brevo.com
SMTP_PASS=sua-api-key-brevo
SMTP_FROM=noreply@seudominio.com
```

**⚠️ IMPORTANTE:**
- `SMTP_USER` é o email da sua conta Brevo
- `SMTP_PASS` é a API Key gerada
- Você precisa verificar um domínio OU usar o email da conta

**Limite gratuito:** 300 emails/dia (9.000/mês)

---

### 4️⃣ **Amazon SES** (Mais Barato em Volume)

**Por que escolher:**
- ✅ Muito barato ($0.10 por 1.000 emails após o free tier)
- ✅ Extremamente confiável (AWS)
- ✅ 62.000 emails/mês grátis (se estiver em EC2)
- ⚠️ Requer mais configuração

**Setup:**
1. Acesse: **https://aws.amazon.com/ses/**
2. Crie conta AWS (se não tiver)
3. Vá em **SES** > **SMTP Settings**
4. Crie credenciais SMTP
5. Verifique seu domínio ou email

**Configuração no Render:**
```env
SMTP_HOST=email-smtp.regiao.amazonaws.com
SMTP_PORT=587
SMTP_USER=sua-smtp-username
SMTP_PASS=sua-smtp-password
SMTP_FROM=noreply@seudominio.com
```

**⚠️ IMPORTANTE:**
- Substitua `regiao` pela sua região AWS (ex: `us-east-1`)
- Você precisa verificar domínio/email
- Pode estar em "sandbox mode" inicialmente

**Limite gratuito:** 62.000 emails/mês (se em EC2) ou 1.000 emails/mês

---

## 🎯 Recomendação por Situação

### **Para Começar Rápido:**
→ **Resend** (mais fácil, 3.000/mês grátis)

### **Para Produção Confiável:**
→ **Mailgun** (muito estável, 1.000/mês grátis)

### **Para Muitos Emails:**
→ **Brevo** (300/dia = 9.000/mês grátis)

### **Para Custo Mínimo:**
→ **Amazon SES** (muito barato em volume)

---

## 🔄 Como Migrar

1. Escolha um serviço acima
2. Crie conta e obtenha credenciais
3. Atualize as variáveis de ambiente no Render
4. Reinicie o serviço
5. Teste enviando um email

**O código não precisa ser alterado!** Apenas as variáveis de ambiente.

---

## ✅ Teste Rápido

Após configurar, você pode testar com:

```bash
node scripts/test-email-completo.js
```

Ou faça um pagamento de teste e verifique se o email com token é enviado.

---

## 🆘 Problemas Comuns

### Erro: "Authentication failed"
- ✅ Verifique se `SMTP_USER` está correto (cada serviço tem formato diferente)
- ✅ Verifique se a API Key está correta
- ✅ Verifique se o domínio/email está verificado

### Emails não chegam
- ✅ Verifique pasta de spam
- ✅ Verifique logs do serviço de email
- ✅ Verifique se não excedeu limite gratuito

### Timeout de conexão
- ✅ Verifique se a porta está correta (geralmente 587)
- ✅ Verifique se o host está correto
- ✅ Se persistir, pode ser firewall do Render (raro)

---

## 📊 Comparação Rápida

| Serviço | Emails Grátis/Mês | Facilidade | Confiabilidade |
|---------|-------------------|------------|----------------|
| **Resend** | 3.000 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Mailgun** | 1.000 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Brevo** | 9.000 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Amazon SES** | 1.000-62.000 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ✨ Pronto!

Escolha o serviço que melhor se adequa às suas necessidades e configure no Render!

