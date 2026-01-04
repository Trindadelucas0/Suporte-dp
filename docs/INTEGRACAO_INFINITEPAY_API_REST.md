# 🔗 INTEGRAÇÃO INFINITEPAY - API REST

## 📋 DOCUMENTAÇÃO OFICIAL

API REST do InfinitePay para criação de links de pagamento e webhooks.

**Endpoint base:** `https://api.infinitepay.io/invoices/public/checkout`

---

## ✅ O QUE FOI IMPLEMENTADO

### 1. Criação de Links de Pagamento

**Endpoint:** `POST /invoices/public/checkout/links`

**Payload:**
```json
{
  "handle": "lucas-rodrigues-740",
  "itens": [
    {
      "quantity": 1,
      "price": 1990,
      "description": "Mensalidade - Suporte DP"
    }
  ],
  "order_nsu": "user_123_2025-01-15",
  "redirect_url": "https://seuapp.com/cobranca/pagamento-sucesso",
  "webhook_url": "https://seuapp.com/webhook/infinitepay",
  "customer": {
    "name": "Nome do Cliente",
    "email": "cliente@email.com"
  }
}
```

**Resposta:**
```json
{
  "link": "https://checkout.infinitepay.io/...",
  "invoice_slug": "abc123",
  "order_nsu": "user_123_2025-01-15"
}
```

---

### 2. Webhook de Pagamento

**Endpoint no seu sistema:** `POST /webhook/infinitepay`

**Payload recebido:**
```json
{
  "invoice_slug": "abc123",
  "amount": 1990,
  "paid_amount": 1990,
  "installments": 1,
  "capture_method": "credit_card",
  "transaction_nsu": "UUID",
  "order_nsu": "user_123_2025-01-15",
  "receipt_url": "https://comprovante.com/123",
  "items": [...]
}
```

**Resposta esperada:**
- Status 200 OK - Pagamento processado com sucesso
- Status 400 Bad Request - Erro (InfinitePay tentará reenviar)

---

### 3. Consulta de Status (Opcional)

**Endpoint:** `POST /invoices/public/checkout/payment_check`

**Payload:**
```json
{
  "handle": "lucas-rodrigues-740",
  "order_nsu": "user_123_2025-01-15",
  "transaction_nsu": "UUID",
  "slug": "abc123"
}
```

**Resposta:**
```json
{
  "success": true,
  "paid": true,
  "amount": 1990,
  "paid_amount": 1990,
  "installments": 1,
  "capture_method": "pix"
}
```

---

## ⚙️ CONFIGURAÇÃO

### Variáveis de Ambiente:

```env
# Handle (InfiniteTag) - OBRIGATÓRIO
INFINITEPAY_HANDLE=lucas-rodrigues-740

# Modo MOCK (para testes)
INFINITEPAY_USE_MOCK=false

# Webhook Secret (opcional - se InfinitePay fornecer)
INFINITEPAY_WEBHOOK_SECRET=seu-secret-aqui

# URL do seu app (para redirect_url e webhook_url)
APP_URL=https://seu-app.com
```

---

## 🔄 FLUXO COMPLETO

### 1. Cliente Assina Plano

1. Cliente acessa `/cobranca/assinar`
2. Sistema cria cobrança no banco
3. Sistema chama `InfinitePayProvider.createCharge()`
4. Provider faz POST para API InfinitePay
5. InfinitePay retorna link de pagamento
6. Cliente é redirecionado para o link

### 2. Cliente Paga

1. Cliente completa pagamento no InfinitePay
2. InfinitePay redireciona para `redirect_url` com parâmetros
3. InfinitePay envia webhook para `webhook_url`

### 3. Webhook Recebido

1. Sistema recebe POST em `/webhook/infinitepay`
2. `WebhookController` processa payload
3. Busca cobrança pelo `order_nsu`
4. Marca como paga
5. Libera acesso do cliente
6. Envia email de confirmação

---

## 📝 IMPORTANTE

### Valores em Centavos

A API InfinitePay trabalha com valores em **centavos**:
- R$ 19,90 = 1990 centavos
- R$ 100,00 = 10000 centavos

O provider faz a conversão automaticamente:
- **Enviar:** Converte reais → centavos
- **Receber:** Converte centavos → reais

### Order NSU

O `order_nsu` é o identificador único do pedido. É usado como `external_id` no sistema:
- Identifica a cobrança no banco
- Rastreia pagamentos
- Usado no webhook para buscar cobrança

**Formato sugerido:** `user_{user_id}_{data}`

Exemplo: `user_123_2025-01-15`

---

## 🔐 SEGURANÇA

### Validação de Webhook

Atualmente, o sistema não valida assinatura do webhook (InfinitePay não documentou método).

**Recomendações:**
1. Validar `order_nsu` existe no banco
2. Validar `amount` corresponde ao esperado
3. Implementar validação de IP (se InfinitePay fornecer lista)

---

## 🧪 TESTES

### Modo MOCK

Para testar sem usar API real:

```env
INFINITEPAY_USE_MOCK=true
```

Isso gera links simulados que apontam para `/cobranca/pagar/{id}`

### Teste Real

1. Configure `INFINITEPAY_HANDLE`
2. Configure `APP_URL` com URL pública
3. Configure `INFINITEPAY_USE_MOCK=false`
4. Teste criação de link
5. Teste webhook (use endpoint `/webhook/test` ou ferramenta como ngrok)

---

## 📊 DIFERENÇAS: Planos vs API REST

### Sistema de Planos (Anterior):
- Link fixo: `https://invoice.infinitepay.io/plans/{handle}/{planId}`
- Todos pagam o mesmo valor
- Não permite customização por cliente

### API REST (Atual):
- Link dinâmico criado por pedido
- Valor customizado por cobrança
- Dados do cliente pré-preenchidos
- Webhook em tempo real
- Mais controle e flexibilidade

---

## ✅ VANTAGENS DA API REST

1. ✅ **Links únicos** por cobrança
2. ✅ **Valores customizados** (útil para diferentes planos)
3. ✅ **Dados do cliente** pré-preenchidos
4. ✅ **Webhook em tempo real** (não precisa consultar)
5. ✅ **Mais controle** sobre o fluxo
6. ✅ **Melhor rastreabilidade** (order_nsu)

---

**Implementação completa e pronta para uso!** 🚀

