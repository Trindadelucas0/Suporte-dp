# 💳 Fluxo de Pagamento Completo - Suporte DP

## 📋 Visão Geral

O sistema usa um fluxo de **cadastro primeiro, pagamento depois, validação por token**.

---

## 🔄 Fluxo Completo

### **1. CADASTRO (Primeiro Passo)**

**Rota:** `GET /register` → `POST /register`

**Processo:**
1. Usuário acessa `/register`
2. Preenche formulário:
   - Nome completo
   - Email
   - Senha
   - WhatsApp (opcional)
3. Sistema cria usuário com:
   - `status = 'ativo'`
   - `subscription_status = 'pendente'` ⚠️ (aguardando pagamento)
   - `subscription_expires_at = null`
4. Login automático após cadastro
5. Redireciona para `/checkout`

---

### **2. CHECKOUT (Segundo Passo)**

**Rota:** `GET /checkout` → `POST /checkout`

**Processo:**
1. Usuário já está logado (redirecionado após cadastro)
2. Sistema verifica se já tem pagamento ativo
   - Se tem pagamento ativo → redireciona para `/dashboard`
3. Usuário clica em "Gerar Link de Pagamento"
4. Sistema cria pedido interno (`Order`) com:
   - `order_nsu` (UUID único)
   - `status = 'pending'`
   - `valor = 19.90`
   - `user_id = ID do usuário logado` ✅
   - `customer_email = email do usuário` ✅
5. Sistema chama API InfinitePay para criar link de checkout
6. InfinitePay retorna `checkout_url`
7. Usuário é redirecionado para InfinitePay

**Dados enviados para InfinitePay:**
```json
{
  "handle": "lucas-rodrigues-740",
  "items": [{
    "quantity": 1,
    "price": 1990,  // R$ 19,90 em centavos
    "description": "suporte-dp"
  }],
  "order_nsu": "uuid-do-pedido",
  "redirect_url": "https://seu-app.com/checkout/sucesso",
  "webhook_url": "https://seu-app.com/webhook/infinitepay",
  "customer_email": "email@usuario.com"
}
```

---

### **3. PAGAMENTO (InfinitePay)**

**Processo:**
1. Usuário completa pagamento no InfinitePay (PIX, cartão, boleto)
2. InfinitePay processa pagamento
3. InfinitePay envia webhook para nosso servidor
4. InfinitePay redireciona usuário para `/checkout/sucesso`

---

### **4. WEBHOOK (Processamento Assíncrono)**

**Rota:** `POST /webhook/infinitepay`

**Processo:**
1. Sistema recebe webhook do InfinitePay
2. Responde `200 OK` rapidamente (antes de processar tudo)
3. Processa assincronamente:
   
   **a) Validação:**
   - Valida estrutura do payload
   - Verifica se `order_nsu` existe
   - Verifica se já foi processado (evita duplicação)
   
   **b) Salva Pagamento:**
   - Cria registro em `payments` com:
     - `order_nsu`
     - `transaction_nsu`
     - `paid_amount` (em centavos)
     - `status = 'paid'`
     - `paid_at`
     - `next_billing_date` (30 dias)
   
   **c) Verifica Usuário:**
   
   **CENÁRIO 1: Usuário JÁ existe (Renovação ou Checkout após cadastro)**
   - Busca usuário por `user_id` do order
   - Se encontrado:
     - Atualiza `subscription_status = 'ativa'`
     - Atualiza `subscription_expires_at = hoje + 30 dias`
     - Vincula `user_id` ao pagamento
     - ✅ **Pronto! Usuário já tem acesso**
   
   **CENÁRIO 2: Usuário NÃO existe (Primeiro pagamento)**
   - Gera **TOKEN DE VALIDAÇÃO** (UUID único)
   - Salva token em `payment_tokens`:
     - `token` (UUID)
     - `order_nsu`
     - `email` (do pagamento)
     - `expires_at` (24 horas)
     - `used = false`
   - **Envia email com token** para o email usado no pagamento
   - ⏳ **Aguarda validação do token**

---

### **5. EMAIL COM TOKEN**

**Conteúdo do Email:**
- Token de validação (UUID)
- Link direto para validação
- Instruções de uso
- Informações do pagamento (valor, pedido)
- ⚠️ Avisos: token expira em 24h, uso único

**Exemplo:**
```
Token: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Acesse: https://seu-app.com/validar-pagamento?token=...&email=...
```

---

### **6. VALIDAÇÃO DO TOKEN**

**Rota:** `GET /validar-pagamento` → `POST /validar-pagamento`

**Processo:**
1. Usuário recebe email com token
2. Acessa `/validar-pagamento` (pode usar link do email)
3. Preenche formulário:
   - Email (usado no pagamento)
   - Token (recebido por email)
4. Sistema valida:
   - ✅ Token existe no banco
   - ✅ Token não foi usado ainda
   - ✅ Token não expirou (24 horas)
   - ✅ Email corresponde ao token
5. **Se válido:**
   
   **CENÁRIO A: Usuário JÁ existe (mesmo email)**
   - Marca token como usado (`used = true`)
   - Atualiza assinatura:
     - `subscription_status = 'ativa'`
     - `subscription_expires_at = hoje + 30 dias`
   - Login automático
   - Redireciona para `/dashboard`
   
   **CENÁRIO B: Usuário NÃO existe**
   - Marca token como usado
   - Salva token na sessão
   - Redireciona para `/register?token_validado=true`
   - ⚠️ **Usuário precisa completar cadastro**

---

### **7. CADASTRO APÓS VALIDAÇÃO DO TOKEN (Se necessário)**

**Rota:** `GET /register?token_validado=true`

**Processo:**
1. Usuário chega em `/register` com token já validado
2. Preenche formulário de cadastro
3. Sistema cria usuário e:
   - Vincula ao token (via `order_nsu`)
   - Define `subscription_status = 'ativa'`
   - Define `subscription_expires_at = hoje + 30 dias`
4. Login automático
5. Redireciona para `/dashboard`

---

## 📊 Estados do Sistema

### **Usuário:**
- `subscription_status`:
  - `'pendente'` → Aguardando pagamento
  - `'ativa'` → Pagamento confirmado, acesso liberado
  - `'inadimplente'` → Assinatura expirada
  - `'cancelada'` → Cancelada

### **Pedido (Order):**
- `status`:
  - `'pending'` → Aguardando pagamento
  - `'paid'` → Pago
  - `'cancelled'` → Cancelado

### **Token:**
- `used`:
  - `false` → Disponível
  - `true` → Já foi usado (não pode usar novamente)
- `expires_at` → Expira em 24 horas

---

## 🔐 Segurança

### **Token:**
- ✅ UUID único (muito difícil de adivinhar)
- ✅ One-time use (só pode ser usado uma vez)
- ✅ Expira em 24 horas
- ✅ Vinculado ao email do pagamento

### **Webhook:**
- ✅ Valida estrutura do payload
- ✅ Verifica duplicação (transaction_nsu)
- ✅ Processa em transação SQL (atomicidade)

---

## 📝 Exemplo de Fluxo Completo

### **Cenário 1: Usuário novo (fluxo completo)**

```
1. Usuário acessa /register
   → Preenche dados
   → Cria conta (status: pendente)
   → Redireciona para /checkout

2. Usuário em /checkout
   → Clica "Gerar Link"
   → Sistema cria Order (user_id preenchido)
   → Redireciona para InfinitePay

3. Usuário paga no InfinitePay
   → InfinitePay processa
   → Envia webhook
   → Gera token
   → Envia email com token

4. Usuário recebe email
   → Acessa /validar-pagamento
   → Insere token + email
   → Token validado
   → Acesso liberado (30 dias)
   → Redireciona para /dashboard
```

### **Cenário 2: Usuário já cadastrado (renovação)**

```
1. Usuário logado acessa /renovar
   → Clica "Renovar Assinatura"
   → Sistema cria Order (user_id preenchido)
   → Redireciona para InfinitePay

2. Usuário paga no InfinitePay
   → InfinitePay processa
   → Envia webhook

3. Webhook processa
   → Encontra usuário pelo user_id
   → Atualiza assinatura (ativa, +30 dias)
   → ✅ Pronto! Usuário já tem acesso
```

---

## ⚠️ Pontos Importantes

1. **Email é obrigatório** no pagamento para receber o token
2. **Token expira em 24 horas** - usuário deve validar rápido
3. **Token é one-time use** - após usar, não pode usar novamente
4. **Se usuário não existe** após validar token, precisa completar cadastro
5. **Renovações** não precisam de token (usuário já existe)

---

## 🔧 Configuração Necessária

### **Variáveis de Ambiente:**
```env
# InfinitePay
INFINITEPAY_HANDLE=lucas-rodrigues-740
APP_URL=https://seu-app.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha-de-app
SMTP_FROM=noreply@seudominio.com
```

### **Migrações SQL:**
- ✅ `012_create_payment_tokens.sql` - Tabela de tokens

---

## ✅ Checklist de Teste

- [ ] Cadastro cria usuário com status `pendente`
- [ ] Checkout cria Order com `user_id` e `customer_email`
- [ ] Webhook gera token quando usuário não existe
- [ ] Email é enviado com token
- [ ] Token é válido por 24 horas
- [ ] Token só pode ser usado uma vez
- [ ] Validação libera acesso (30 dias)
- [ ] Renovação atualiza assinatura sem token

---

**Última atualização:** 2024
**Versão:** 2.0 (com tokens)

