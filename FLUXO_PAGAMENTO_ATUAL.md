# 💳 Fluxo de Pagamento Atual - Suporte DP

## 📋 Resumo Rápido

**Quando o usuário faz pagamento:**
1. ✅ **SEMPRE** recebe token por email (se não houver token válido já gerado)
2. ✅ Token é enviado **automaticamente** após confirmação do pagamento
3. ✅ Token expira em **24 horas**
4. ✅ Token só pode ser usado **uma vez**
5. ✅ Acesso só é liberado após **validação do token**

---

## 🔄 Fluxo Completo Passo a Passo

### **1️⃣ USUÁRIO FAZ CHECKOUT**

**Cenário A: Usuário Novo (Primeiro Pagamento)**
1. Usuário se cadastra em `/register`
2. Sistema cria usuário com `subscription_status = 'pendente'`
3. Redireciona para `/checkout`
4. Usuário clica em "Gerar Link de Pagamento"
5. Sistema cria `Order` com:
   - `order_nsu` (UUID único)
   - `user_id` = ID do usuário (se logado)
   - `customer_email` = Email do usuário
   - `status = 'pending'`
6. Redireciona para InfinitePay

**Cenário B: Usuário Existente (Renovação)**
1. Usuário logado acessa `/renovar` ou `/checkout`
2. Sistema cria `Order` com `user_id` preenchido
3. Redireciona para InfinitePay

---

### **2️⃣ PAGAMENTO NO INFINITEPAY**

1. Usuário completa pagamento (PIX, cartão, boleto)
2. InfinitePay processa pagamento
3. InfinitePay envia **webhook** para nosso servidor
4. InfinitePay redireciona usuário para `/checkout/sucesso`

---

### **3️⃣ WEBHOOK PROCESSADO (AUTOMÁTICO)**

**Rota:** `POST /webhook/infinitepay`

**O que acontece:**

1. **Sistema recebe webhook** do InfinitePay
2. **Responde 200 OK** rapidamente (antes de processar)
3. **Processa em transação SQL** (atomicidade):

   **a) Validação:**
   - Verifica se `order_nsu` existe
   - Verifica se já foi processado (evita duplicação)
   - Valida estrutura do payload

   **b) Salva Pagamento:**
   - Cria registro em `payments` com:
     - `order_nsu`
     - `transaction_nsu`
     - `status = 'paid'`
     - `paid_amount` (em centavos)
     - `paid_at`
     - `next_billing_date` (30 dias)
     - `user_id` (se usuário já existe)

   **c) Verifica Usuário:**
   - Busca usuário por `user_id` do order (se existir)
   - OU busca por `customer_email` do order
   - OU busca por email do webhook

   **d) GERA TOKEN (SEMPRE):**
   - ✅ **Verifica se já existe token válido** para este `order_nsu`
   - ✅ Se **NÃO existe** token válido:
     - Gera novo token (UUID único)
     - Salva em `payment_tokens`:
       - `token` (UUID)
       - `order_nsu`
       - `email` (do pagamento)
       - `user_id` (se usuário já existe)
       - `expires_at` (24 horas)
       - `used = false`
     - **Envia email com token** via Resend
   - ✅ Se **JÁ existe** token válido:
     - Não gera novo token
     - Log informativo

   **e) NÃO ATIVA ASSINATURA:**
   - ⚠️ **IMPORTANTE:** A assinatura NÃO é ativada automaticamente
   - A ativação só acontece após **validação do token**

---

### **4️⃣ EMAIL COM TOKEN ENVIADO**

**Quando:** Imediatamente após o webhook processar o pagamento

**Conteúdo do Email:**
- ✅ Token de validação (UUID)
- ✅ Link direto para validação
- ✅ Instruções de uso
- ✅ Informações do pagamento (valor, pedido)
- ⚠️ Avisos: token expira em 24h, uso único

**Exemplo:**
```
Assunto: Seu token de validação - Suporte DP

Olá [Nome],

Seu pagamento foi confirmado!

Token: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Acesse: https://departamento-pessoal.onrender.com/validar-pagamento?token=...&email=...

Este token expira em 24 horas e só pode ser usado uma vez.
```

---

### **5️⃣ USUÁRIO RECEBE EMAIL**

**Opções para o usuário:**

**A) Usuário clica no link do email:**
- Vai direto para `/validar-pagamento` com token e email preenchidos
- Só precisa confirmar

**B) Usuário acessa manualmente:**
- Vai para `/validar-pagamento`
- Digita token e email recebidos

**C) Usuário tenta fazer login:**
- Sistema detecta pagamento confirmado mas sem token validado
- Redireciona automaticamente para `/validar-pagamento`

---

### **6️⃣ VALIDAÇÃO DO TOKEN**

**Rota:** `POST /validar-pagamento`

**Processo:**

1. **Usuário insere token e email**
2. **Sistema valida:**
   - ✅ Token existe no banco
   - ✅ Token não foi usado
   - ✅ Token não expirou (24h)
   - ✅ Email corresponde ao token

3. **Se válido:**
   - Marca token como usado (`used = true`)
   - Busca ou cria usuário:
     - **Se usuário existe:**
       - Atualiza `subscription_status = 'ativa'`
       - Atualiza `subscription_expires_at = hoje + 30 dias`
       - Vincula `user_id` ao pagamento
     - **Se usuário NÃO existe:**
       - Redireciona para `/register?token_validado=true`
       - Usuário completa cadastro
       - Cadastro já cria com `subscription_status = 'ativa'`
   - Limpa sessão `requireTokenValidation`
   - Redireciona para `/dashboard`

4. **Se inválido:**
   - Mostra erro específico:
     - "Token inválido"
     - "Token já foi utilizado"
     - "Token expirado"
     - "Email não corresponde ao token"

---

### **7️⃣ ACESSO LIBERADO**

Após validação do token:
- ✅ `subscription_status = 'ativa'`
- ✅ `subscription_expires_at = hoje + 30 dias`
- ✅ Usuário pode acessar `/dashboard` e todas as funcionalidades
- ✅ Acesso válido por **30 dias**

---

## 🔄 Casos Especiais

### **Caso 1: Token Não Recebido por Email**

**Se o usuário fez pagamento mas não recebeu email:**

1. Usuário tenta fazer login
2. Sistema detecta:
   - Pagamento confirmado ✅
   - Mas sem token pendente ❌
3. Sistema **gera token automaticamente** e envia email
4. Redireciona para `/validar-pagamento`

**Código:** `controllers/authController.js` (linha ~196)

---

### **Caso 2: Token Expirado**

**Se o token expirou (24h):**

1. Usuário tenta validar token expirado
2. Sistema mostra erro: "Token expirado"
3. **Solução:** Usuário precisa fazer **novo pagamento** para receber novo token

**⚠️ IMPORTANTE:** Token só é gerado uma vez por pagamento. Para novo token, precisa novo pagamento.

---

### **Caso 3: Token Já Usado**

**Se o token já foi usado:**

1. Usuário tenta validar token usado
2. Sistema mostra erro: "Este token já foi utilizado"
3. **Solução:** Se o usuário já validou, deve fazer login normalmente

---

### **Caso 4: Múltiplos Pagamentos**

**Se o usuário fez múltiplos pagamentos:**

- Cada pagamento gera **um token único**
- Token é vinculado ao `order_nsu` específico
- Sistema verifica se já existe token válido antes de gerar novo
- Se já existe token válido para aquele pagamento, não gera novo

---

## 🔐 Segurança

### **Token:**
- ✅ UUID único (muito difícil de adivinhar)
- ✅ One-time use (só pode ser usado uma vez)
- ✅ Expira em 24 horas
- ✅ Vinculado ao email do pagamento
- ✅ Vinculado ao `order_nsu` específico

### **Webhook:**
- ✅ Valida estrutura do payload
- ✅ Verifica duplicação (`transaction_nsu`)
- ✅ Processa em transação SQL (atomicidade)
- ✅ Responde rápido (não bloqueia InfinitePay)

### **Validação:**
- ✅ Verifica token, email, expiração, uso
- ✅ Processa em transação SQL
- ✅ Marca token como usado imediatamente

---

## 📊 Resumo Visual

```
┌─────────────────┐
│  Usuário Paga   │
│  no InfinitePay │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Webhook Recebido│
│  (Automático)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Token Gerado   │
│  (Se não existe)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Enviado  │
│  (Resend)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Usuário Recebe │
│  Email com Token│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Usuário Valida │
│  Token          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Acesso Liberado│
│  (30 dias)      │
└─────────────────┘
```

---

## ✅ Checklist do Fluxo

- [x] Usuário faz pagamento
- [x] Webhook recebido e processado
- [x] Token gerado (se não existe válido)
- [x] Email enviado com token
- [x] Usuário recebe email
- [x] Usuário valida token
- [x] Acesso liberado por 30 dias

---

## 🎯 Resposta Direta

**"Quando usuário faz pagamento recebe token?"**

✅ **SIM!** O usuário **SEMPRE** recebe token por email quando:
1. O pagamento é confirmado pelo InfinitePay
2. O webhook é processado
3. Não existe token válido já gerado para aquele pagamento

**O token é enviado automaticamente via Resend logo após a confirmação do pagamento.**

---

**Última atualização:** 2024-01-XX

