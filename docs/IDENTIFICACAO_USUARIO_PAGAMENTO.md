# 🔍 Como o Sistema Identifica Qual Usuário Fez o Pagamento

## 📋 RESUMO

O sistema identifica o usuário através de **3 métodos em cascata**, garantindo que o pagamento seja sempre vinculado ao usuário correto.

## 🔄 PROCESSO COMPLETO

### 1️⃣ **CRIAÇÃO DO PEDIDO (Checkout)**

Quando o usuário está logado e vai para `/checkout`:

```javascript
// controllers/checkoutController.js - linha 108
const order = await Order.create(valor, userId, user.email);
```

O sistema cria um `order` no banco com:
- ✅ `user_id` = ID do usuário logado
- ✅ `customer_email` = Email do usuário logado
- ✅ `order_nsu` = UUID único do pedido

**Exemplo:**
```
Order criado:
- order_nsu: "abc-123-def-456"
- user_id: "user-789-xyz"  ← ID do usuário logado
- customer_email: "usuario@email.com"  ← Email do usuário
- status: "pending"
```

### 2️⃣ **PAGAMENTO NO INFINITEPAY**

Usuário clica no link de pagamento e paga no InfinitePay.

O InfinitePay recebe o `order_nsu` no checkout e processa o pagamento.

### 3️⃣ **WEBHOOK RECEBIDO**

Quando o pagamento é confirmado, InfinitePay envia webhook com:

```json
{
  "order_nsu": "abc-123-def-456",  ← Mesmo order_nsu criado no passo 1
  "transaction_nsu": "trans-789",
  "status": "paid",
  "paid_at": "2024-01-15T10:30:00Z",
  "paid_amount": 19.90
  // Pode ou não ter customer_email aqui (depende do InfinitePay)
}
```

### 4️⃣ **IDENTIFICAÇÃO DO USUÁRIO (Webhook)**

O sistema busca o usuário usando **3 métodos em cascata**:

#### **MÉTODO 1: user_id do Order (PRINCIPAL) ⭐**

```javascript
// controllers/webhookController.js - linha 113
if (order.user_id) {
  const userResult = await client.query(
    'SELECT id, nome, email FROM users WHERE id = $1',
    [order.user_id]
  );
  existingUser = userResult.rows[0];
}
```

✅ **Vantagem:** Mais rápido e seguro - vincula diretamente pelo ID do usuário logado

#### **MÉTODO 2: customer_email do Order (FALLBACK 1)**

```javascript
// controllers/webhookController.js - linha 126
if (!existingUser && order.customer_email) {
  const userResult = await client.query(
    'SELECT id, nome, email FROM users WHERE email = $1',
    [order.customer_email]
  );
  existingUser = userResult.rows[0];
}
```

✅ **Vantagem:** Funciona mesmo se user_id não estiver disponível

#### **MÉTODO 3: Email do Payload do Webhook (FALLBACK 2)**

```javascript
// controllers/webhookController.js - linha 140
const customerEmail = payload.customer_email || payload.email || null;
if (customerEmail) {
  const userResult = await client.query(
    'SELECT id, nome, email FROM users WHERE email = $1',
    [customerEmail]
  );
  existingUser = userResult.rows[0];
}
```

✅ **Vantagem:** Funciona se InfinitePay enviar email no webhook

### 5️⃣ **VINCULAÇÃO DO PAGAMENTO**

Quando o usuário é encontrado, o sistema:

1. Atualiza o `payment.user_id` com o ID do usuário
2. Atualiza a assinatura do usuário:
   - `subscription_status = 'ativa'`
   - `subscription_expires_at = paid_at + 30 dias`
   - `status = 'ativo'`

## 🔒 SEGURANÇA

O sistema garante segurança através de:

1. ✅ **Sessão do Usuário**: Usuário precisa estar logado para criar pedido
2. ✅ **user_id no Order**: Vincula o pedido diretamente ao usuário logado
3. ✅ **Validação do order_nsu**: Verifica se o pedido existe antes de processar
4. ✅ **Transação SQL**: Garante atomicidade (tudo ou nada)

## 📊 FLUXO VISUAL

```
┌─────────────────┐
│ Usuário Logado  │
│  user_id: 123   │
│  email: user@   │
└────────┬────────┘
         │
         │ Vai para /checkout
         ▼
┌─────────────────┐
│ Sistema cria    │
│ Order:          │
│  - order_nsu    │
│  - user_id: 123 │ ← Vinculado ao usuário
│  - customer_email│
└────────┬────────┘
         │
         │ Usuário paga
         ▼
┌─────────────────┐
│ InfinitePay     │
│ processa        │
│ pagamento       │
└────────┬────────┘
         │
         │ Envia webhook
         ▼
┌─────────────────┐
│ Webhook recebe: │
│  - order_nsu    │
└────────┬────────┘
         │
         │ Busca order no banco
         ▼
┌─────────────────┐
│ Order encontrado│
│  - user_id: 123 │ ← ID do usuário!
└────────┬────────┘
         │
         │ Busca usuário pelo user_id
         ▼
┌─────────────────┐
│ Usuário         │
│ identificado!   │
│  - Atualiza     │
│    assinatura   │
└─────────────────┘
```

## ✅ CONCLUSÃO

O sistema identifica o usuário porque:

1. **Order é criado COM user_id** (quando usuário está logado)
2. **Webhook busca order pelo order_nsu**
3. **Order contém user_id** → Identifica usuário diretamente
4. **Sistema atualiza assinatura do usuário correto**

**É SEGURO porque:**
- ✅ Usuário precisa estar logado para criar pedido
- ✅ Order é vinculado ao user_id no momento da criação
- ✅ Webhook não pode falsificar user_id (vem do banco)
- ✅ Transação garante consistência

