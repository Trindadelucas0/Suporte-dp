# 🚀 Guia Rápido: Enviar Emails no Render com SendGrid

## ⚡ Solução em 5 Passos

### 1️⃣ Criar Conta SendGrid (GRATUITA)

1. Acesse: **https://signup.sendgrid.com/**
2. Clique em **"Start for free"**
3. Preencha:
   - Email
   - Senha
   - Nome
   - Empresa (opcional)
4. Confirme seu email (verifique sua caixa de entrada)
5. Complete o cadastro

**✅ Plano gratuito inclui:** 100 emails/dia (suficiente para começar!)

---

### 2️⃣ Criar API Key no SendGrid

1. Faça login no SendGrid
2. No menu lateral, clique em **Settings** (Configurações)
3. Clique em **API Keys**
4. Clique no botão **Create API Key** (Criar chave de API)
5. Escolha:
   - **Name**: Dê um nome (ex: "Suporte DP Render")
   - **API Key Permissions**: Selecione **Full Access** OU **Restricted Access** (escolha "Mail Send")
6. Clique em **Create & View**
7. **⚠️ IMPORTANTE**: Copie a API Key que aparece (você só verá uma vez!)
   - Parece com: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Cole em um bloco de notas por enquanto

---

### 3️⃣ Verificar Email Remetente no SendGrid

1. No SendGrid, vá em **Settings** > **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Preencha o formulário:
   - **From Email Address**: Seu email (ex: `noreply@seudominio.com`)
   - **From Name**: Nome que aparecerá (ex: "Suporte DP")
   - **Reply To**: Mesmo email ou outro
   - **Company Address**: Endereço da empresa
   - **Company City**: Cidade
   - **Company State**: Estado
   - **Company Country**: País (Brasil)
4. Clique em **Create**
5. **Verifique o email** que o SendGrid enviará (confirme o link)
6. ✅ Após verificar, você verá "Single Sender Verification: Verified"

---

### 4️⃣ Configurar no Render

1. Acesse seu painel no Render: **https://dashboard.render.com/**
2. Vá no seu serviço (Web Service)
3. No menu lateral, clique em **Environment**
4. Clique em **Add Environment Variable** (ou edite as existentes)
5. Configure as seguintes variáveis:

#### ⚙️ Configuração SMTP SendGrid:

```
SMTP_HOST = smtp.sendgrid.net
```

```
SMTP_PORT = 587
```

```
SMTP_USER = apikey
```
⚠️ **IMPORTANTE**: Deve ser exatamente `apikey` (não seu email!)

```
SMTP_PASS = SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Cole aqui a API Key que você copiou no passo 2

```
SMTP_FROM = noreply@seudominio.com
```
Use o email que você verificou no passo 3

---

### 5️⃣ Reiniciar o Serviço no Render

1. No Render, vá em **Settings** do seu serviço
2. Clique em **Manual Deploy** > **Deploy latest commit**
   - OU simplesmente salve as variáveis (o Render reinicia automaticamente)

3. Aguarde o deploy finalizar (pode levar 1-2 minutos)

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
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua-api-key-aqui
SMTP_FROM=noreply@seudominio.com
```

---

## ❌ Problemas Comuns

### Erro: "Authentication failed"
- ✅ Verifique se `SMTP_USER` está como `apikey` (literalmente, não seu email)
- ✅ Verifique se a API Key está correta
- ✅ Verifique se a API Key tem permissão de envio

### Erro: "From address not verified"
- ✅ Verifique o email remetente no SendGrid (Single Sender)
- ✅ Use o email verificado no `SMTP_FROM`

### Emails não chegam
- ✅ Verifique a pasta de spam
- ✅ Verifique logs do SendGrid (Activity Feed)
- ✅ Verifique se não excedeu 100 emails/dia (plano gratuito)

### Timeout de conexão
- ✅ Se ainda der timeout, o problema pode ser firewall do Render
- ✅ Considere usar SendGrid via API (requer mudança no código)

---

## 📊 Limites do Plano Gratuito SendGrid

- ✅ **100 emails/dia** (gratuito)
- ✅ **25.000 emails/mês** (se adicionar cartão de crédito - ainda grátis)
- ✅ SMTP e API funcionam
- ✅ Tracking e relatórios

---

## 🆘 Suporte SendGrid

- Documentação: https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp
- Status: https://status.sendgrid.com/
- Suporte: Disponível no painel do SendGrid

---

## ✨ Pronto!

Após seguir esses passos, seus emails devem funcionar no Render!

O código **não precisa ser alterado** - apenas as variáveis de ambiente no Render.

