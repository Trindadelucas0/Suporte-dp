# 🚀 Configuração no Render

## 📋 Variáveis de Ambiente no Render

### Como Configurar

1. Acesse: https://dashboard.render.com/
2. Selecione seu serviço (Web Service)
3. No menu lateral, clique em **Environment**
4. Clique em **Add Environment Variable** para cada variável
5. Salve (o Render reinicia automaticamente)

---

## 📧 Configuração de Email

Para enviar emails no Render, use serviços transacionais (Gmail é bloqueado no Render):

### Opções Recomendadas:

#### 1. **Resend** (Mais Fácil - Recomendado)
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_sua-api-key-aqui
SMTP_FROM=onboarding@resend.dev
```

**📖 Guia completo:** Veja `GUIA_RAPIDO_RESEND.md`

#### 2. **Mailgun** (Muito Confiável)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seudominio.com
SMTP_PASS=sua-api-key-mailgun
SMTP_FROM=noreply@seudominio.com
```

#### 3. **Brevo** (Mais Emails Grátis)
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=seu-email@brevo.com
SMTP_PASS=sua-api-key-brevo
SMTP_FROM=noreply@seudominio.com
```

**📖 Mais opções:** Veja `docs/ALTERNATIVAS_EMAIL_RENDER.md`

**⚠️ IMPORTANTE:**
- Cada serviço tem formato diferente de `SMTP_USER`
- `SMTP_PASS` é sempre a API Key do serviço
- `SMTP_FROM` deve ser um email/domínio verificado

---

## 🔐 Variáveis de Ambiente Essenciais

### Banco de Dados
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Sessão
```env
SESSION_SECRET=sua-chave-secreta-forte-aqui
```

### InfinitePay
```env
INFINITEPAY_HANDLE=seu-handle
APP_URL=https://seu-app.onrender.com
```

### Email (SendGrid)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua-api-key
SMTP_FROM=noreply@seudominio.com
```

---

## 🔄 Após Configurar

1. Salve as variáveis
2. O Render reinicia automaticamente
3. Verifique os logs para confirmar que está funcionando
4. Teste o envio de email

---

## ⚠️ Problemas Comuns

### Emails não funcionam
- ✅ Use SendGrid (Gmail é bloqueado no Render)
- ✅ Verifique `SMTP_USER` está como `apikey`
- ✅ Verifique API Key do SendGrid está correta

### Timeout de conexão
- ✅ Render pode bloquear SMTP padrão
- ✅ Use SendGrid ou outros serviços transacionais
- ✅ Veja `docs/PROBLEMA_SMTP_RENDER.md`

