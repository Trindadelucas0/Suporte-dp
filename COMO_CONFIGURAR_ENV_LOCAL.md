# 🔧 Como Configurar .env para Testes Locais

## 📋 Passo a Passo

### **1. Copiar env.example para .env**

No terminal, execute:

```bash
cp env.example .env
```

**OU** copie manualmente o conteúdo de `env.example` para um novo arquivo chamado `.env`

---

### **2. Configurar Variáveis**

Abra o arquivo `.env` e configure:

#### **Banco de Dados (PostgreSQL Local):**

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres_local
```

**Substitua `sua_senha_postgres_local` pela senha do seu PostgreSQL local.**

---

#### **Email (Brevo API):**

**Já está configurado com sua chave:**
```
BREVO_API_KEY=xsmtpsib-b0a992ef6d6e0916f8c557e9bb689ccb26eb07b7bb2124bd3f53488b6908c25f-iwllVP06b47AgrAc
SMTP_FROM=lucasrodrigues4@live.com
```

**✅ Pronto! Não precisa alterar nada aqui.**

---

#### **Sessão:**

**Já está configurado:**
```
SESSION_SECRET=faad3d2ef152c9361681305f37eff940cdcd4c66645191b5dd26e5e935b996e8
```

**✅ Pronto! Não precisa alterar nada aqui.**

---

#### **URL da Aplicação:**

**Já está configurado para localhost:**
```
APP_URL=http://localhost:3000
```

**✅ Pronto! Não precisa alterar nada aqui.**

---

### **3. Instalar Dependências**

Se ainda não instalou o pacote do Brevo:

```bash
npm install @getbrevo/brevo
```

---

### **4. Testar**

1. **Inicie o servidor:**
   ```bash
   npm start
   ```

2. **Verifique os logs:**
   - Deve aparecer: `✅ EmailService: Usando API HTTP do Brevo`
   - Deve aparecer: `✅ [INICIO] Email de teste enviado com sucesso!`

3. **Verifique sua caixa de entrada:**
   - Você deve receber um email de teste com assunto "🆕 Novo Usuário Cadastrado - TESTE DE CAIXA DE ENTRADA"

---

## ✅ Variáveis Já Configuradas

- ✅ `BREVO_API_KEY` - Sua chave API do Brevo
- ✅ `SMTP_FROM` - Seu email (lucasrodrigues4@live.com)
- ✅ `SESSION_SECRET` - Secret gerado automaticamente
- ✅ `APP_URL` - http://localhost:3000
- ✅ `ADMIN_EMAIL` - lucasrodrigues4@live.com

---

## ⚙️ Variáveis que Você Precisa Configurar

- ⚠️ `DB_PASSWORD` - Senha do seu PostgreSQL local
- ⚠️ `DB_NAME` - Nome do banco (pode ser `suporte_dp` ou outro)
- ⚠️ `DB_USER` - Usuário do PostgreSQL (geralmente `postgres`)

---

## 🚀 Pronto!

Após configurar o `.env`, você pode testar localmente e os emails devem funcionar!

---

**Última atualização:** 2024-01-XX

