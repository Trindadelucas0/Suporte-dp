# 🚀 Guia Rápido: Resend no Render (5 Minutos)

## ⚡ Setup em 5 Passos

### 1️⃣ Criar Conta Resend

1. Acesse: **https://resend.com/**
2. Clique em **"Get Started"** ou **"Sign Up"**
3. Preencha:
   - Email
   - Senha
   - Nome
4. Confirme seu email (verifique sua caixa de entrada)

**✅ Plano gratuito inclui:** 3.000 emails/mês (suficiente para começar!)

---

### 2️⃣ Criar API Key

1. Faça login no Resend
2. No menu lateral, clique em **API Keys**
3. Clique no botão **Create API Key**
4. Dê um nome (ex: "Suporte DP Render")
5. Clique em **Add**
6. **⚠️ IMPORTANTE**: Copie a API Key que aparece (começa com `re_`)
   - Parece com: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Cole em um bloco de notas por enquanto

---

### 3️⃣ Verificar Domínio OU Usar Domínio de Teste

**Opção A: Usar Domínio de Teste (Mais Rápido)**
- O Resend permite usar `onboarding@resend.dev` para testes
- Funciona imediatamente, sem verificação
- ⚠️ Limite: apenas para testes

**Opção B: Verificar Seu Domínio (Recomendado para Produção)**
1. No Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `seudominio.com`)
4. Adicione os registros DNS que o Resend fornecer
5. Aguarde verificação (pode levar alguns minutos)

---

### 4️⃣ Configurar no Render

1. Acesse seu painel no Render: **https://dashboard.render.com/**
2. Selecione seu serviço (Web Service)
3. No menu lateral, clique em **Environment**
4. Clique em **Add Environment Variable** (ou edite as existentes)
5. Configure as seguintes variáveis:

#### ⚙️ Configuração SMTP Resend:

```
SMTP_HOST = smtp.resend.com
```

```
SMTP_PORT = 587
```

```
SMTP_USER = resend
```
⚠️ **IMPORTANTE**: Deve ser exatamente `resend` (não seu email!)

```
SMTP_PASS = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Cole aqui a API Key que você copiou no passo 2

```
SMTP_FROM = noreply@pixsile.resend.app
```
**Para testes:** Use `noreply@pixsile.resend.app` (ou qualquer nome antes do @)  
**Para produção:** Use `noreply@seudominio.com` (domínio verificado)

**💡 Você pode usar qualquer nome antes do @ no domínio de teste:**
- `noreply@pixsile.resend.app`
- `contato@pixsile.resend.app`
- `suporte@pixsile.resend.app`

---

### 5️⃣ Reiniciar o Serviço no Render

1. No Render, salve as variáveis (o Render reinicia automaticamente)
2. Aguarde o deploy finalizar (pode levar 1-2 minutos)

---

## ✅ Testar

Após configurar, você pode testar:

1. **No Render**, vá em **Logs** do seu serviço
2. Procure por mensagens como:
   - `✅ Conexão SMTP estabelecida`
   - `✅ Email enviado com sucesso`

OU execute um pagamento de teste e verifique se o email com token é enviado!

---

## 🎯 Resumo das Variáveis

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_sua-api-key-aqui
SMTP_FROM=noreply@pixsile.resend.app
```

**💡 Você pode usar qualquer nome antes do @:**
- `noreply@pixsile.resend.app`
- `contato@pixsile.resend.app`
- `suporte@pixsile.resend.app`

**Para produção (com domínio verificado):**
```env
SMTP_FROM=noreply@seudominio.com
```

---

## ❌ Problemas Comuns

### Erro: "Authentication failed"
- ✅ Verifique se `SMTP_USER` está como `resend` (literalmente)
- ✅ Verifique se a API Key está correta (começa com `re_`)
- ✅ Verifique se a API Key tem permissão de envio

### Erro: "From address not verified"
- ✅ Para testes: Use `noreply@pixsile.resend.app` (ou qualquer nome antes do @)
- ✅ Para produção: Verifique seu domínio no Resend
- ✅ Use o email verificado no `SMTP_FROM`

### Emails não chegam
- ✅ Verifique a pasta de spam
- ✅ Verifique logs do Resend (Dashboard > Emails)
- ✅ Verifique se não excedeu 3.000 emails/mês (plano gratuito)

### Timeout de conexão
- ✅ Verifique se `SMTP_HOST` está como `smtp.resend.com`
- ✅ Verifique se `SMTP_PORT` está como `587`
- ✅ Se persistir, pode ser firewall do Render (raro)

---

## 📊 Limites do Plano Gratuito Resend

- ✅ **3.000 emails/mês** (gratuito)
- ✅ SMTP e API funcionam
- ✅ Tracking básico
- ✅ Sem necessidade de cartão de crédito

---

## 🆘 Suporte Resend

- Documentação: https://resend.com/docs
- Status: https://status.resend.com/
- Suporte: Disponível no painel do Resend

---

## ✨ Pronto!

Após seguir esses passos, seus emails devem funcionar no Render!

O código **não precisa ser alterado** - apenas as variáveis de ambiente no Render.

