# 🔄 COMO FUNCIONA O FLUXO COMPLETO

## ✅ RESPOSTAS RÁPIDAS

### 1. **Está pegando dados através de WEBHOOK ou API REST?**
**AMBOS! Mas em momentos diferentes:**

- **API REST** → Usado para **CRIAR** o link de pagamento
- **WEBHOOK** → Usado para **RECEBER** confirmação de pagamento

---

## 📊 FLUXO COMPLETO PASSO A PASSO

### **PASSO 1: Criação da Cobrança (API REST)**

Quando o sistema precisa criar uma cobrança:

1. **Sistema chama:** `InfinitePayProvider.createCharge()`
2. **Faz POST para:** `https://api.infinitepay.io/invoices/public/checkout/links`
3. **Envia dados:**
   ```json
   {
     "handle": "lucas-rodrigues-740",
     "itens": [{ "quantity": 1, "price": 1990, "description": "Mensalidade" }],
     "order_nsu": "user_123_2025-01",
     "redirect_url": "https://seu-app.com/cobranca/pagamento-sucesso",
     "webhook_url": "https://seu-app.com/webhook/infinitepay",
     "customer": { "name": "João", "email": "joao@email.com" }
   }
   ```
4. **InfinitePay retorna:**
   ```json
   {
     "link": "https://checkout.infinitepay.io/...",
     "invoice_slug": "abc123",
     "order_nsu": "user_123_2025-01"
   }
   ```
5. **Sistema SALVA no banco:**
   - Tabela `cobrancas`
   - Campos: `external_id`, `link_pagamento`, `valor`, `status: 'pendente'`

---

### **PASSO 2: Cliente Paga**

1. Cliente acessa o `link_pagamento` (salvo no banco)
2. Cliente completa pagamento no InfinitePay
3. InfinitePay faz **2 coisas simultaneamente:**
   - ✅ Redireciona cliente para `redirect_url`
   - ✅ Envia webhook para `webhook_url`

---

### **PASSO 3: Webhook Recebido (WEBHOOK)**

Quando o cliente paga, InfinitePay envia POST para:

**URL:** `https://seu-app.com/webhook/infinitepay`

**Payload recebido:**
```json
{
  "invoice_slug": "abc123",
  "amount": 1990,
  "paid_amount": 1990,
  "order_nsu": "user_123_2025-01",
  "transaction_nsu": "UUID-123",
  "capture_method": "credit_card",
  "receipt_url": "https://comprovante.com/123"
}
```

**O que o sistema faz:**

1. **Recebe webhook** → `/webhook/infinitepay`
2. **Processa payload** → Extrai `order_nsu`
3. **Busca cobrança no banco** → Pelo `external_id` (que é o `order_nsu`)
4. **ATUALIZA no banco:**
   - `status` → `'paga'`
   - `data_pagamento` → Timestamp atual
5. **Libera acesso** → Desbloqueia usuário
6. **Envia email** → Link de cadastro (se não tiver senha)

---

## ✅ ESTÁ SALVANDO OS DADOS CERTINHO NO BANCO?

**SIM! Está salvando corretamente:**

### **Quando cria cobrança:**
```sql
INSERT INTO cobrancas (
  user_id,
  external_id,        -- order_nsu do InfinitePay
  valor,
  status,             -- 'pendente'
  data_vencimento,
  link_pagamento,     -- URL do InfinitePay
  mes_referencia
) VALUES (...)
```

### **Quando webhook confirma pagamento:**
```sql
UPDATE cobrancas 
SET status = 'paga',
    data_pagamento = NOW()
WHERE external_id = 'user_123_2025-01'
```

### **O sistema gerencia tudo:**
- ✅ Lista de cobranças
- ✅ Status de cada cobrança
- ✅ Histórico de pagamentos
- ✅ Lembretes baseados no status
- ✅ Bloqueios baseados no status
- ✅ Monitoramento admin

---

## 🔗 COMO ADICIONAR LINK NO INFINITEPAY?

### **IMPORTANTE: Você NÃO precisa adicionar link manualmente no InfinitePay!**

O sistema já faz isso automaticamente via API REST!

Quando você chama a API para criar o checkout, o sistema já envia:

```javascript
payload.redirect_url = "https://seu-app.com/cobranca/pagamento-sucesso";
payload.webhook_url = "https://seu-app.com/webhook/infinitepay";
```

**Isso é configurado automaticamente no código!**

### **O que você precisa fazer:**

1. **Configurar `APP_URL` no `.env`:**
   ```env
   APP_URL=https://seu-app.com
   ```
   
2. **O sistema faz o resto automaticamente!**

---

## 🎯 CONFIGURAÇÃO NECESSÁRIA

### **No arquivo `.env` de produção:**

```env
# URL do seu app (OBRIGATÓRIO)
APP_URL=https://seu-app.com

# InfinitePay
INFINITEPAY_HANDLE=lucas-rodrigues-740
INFINITEPAY_USE_MOCK=false
```

### **O sistema automaticamente:**
- ✅ Usa `APP_URL` para criar `redirect_url`
- ✅ Usa `APP_URL` para criar `webhook_url`
- ✅ Envia tudo na requisição para InfinitePay

---

## 📋 RESUMO

| Ação | Método | Quando | O que faz |
|------|--------|--------|-----------|
| **Criar cobrança** | API REST | Ao assinar | Cria link de pagamento e salva no banco |
| **Confirmar pagamento** | WEBHOOK | Após pagamento | Atualiza status no banco e libera acesso |
| **Redirect após pagamento** | Automático | Após pagamento | InfinitePay redireciona para `redirect_url` |

---

## ✅ TUDO ESTÁ PRONTO!

**Não precisa adicionar nada manualmente no InfinitePay!**

O sistema já:
- ✅ Cria checkout via API REST
- ✅ Envia `redirect_url` automaticamente
- ✅ Envia `webhook_url` automaticamente
- ✅ Salva dados no banco
- ✅ Processa webhooks
- ✅ Gerencia tudo automaticamente

**Basta configurar o `APP_URL` e está pronto!** 🚀

