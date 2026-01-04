# Integração InfinitePay - Suporte DP

## 📋 FLUXO COMPLETO DO SISTEMA

### 1. PÁGINA PÚBLICA (/)
- Usuário acessa a página inicial
- Clica no botão "Adquirir sistema"
- Redireciona para `/adquirir`

### 2. ROTA /adquirir
**Processo:**
1. Sistema cria um pedido interno no banco com:
   - `order_nsu` (UUID único)
   - `status = "pending"`
   - `valor` (R$ 50,00)
   - `data_criacao`

2. Sistema chama a API InfinitePay:
   - **Endpoint:** `POST https://api.infinitepay.io/invoices/public/checkout/links`
   - **Payload:**
     ```json
     {
       "handle": "lucas-rodrigues-740",
       "items": [
         {
           "quantity": 1,
           "price": 50,
           "description": "suporte-dp"
         }
       ],
       "order_nsu": "<UUID-do-pedido>",
       "redirect_url": "https://departamento-pessoal.onrender.com/register",
       "webhook_url": "https://departamento-pessoal.onrender.com/webhook/infinitepay"
     }
     ```

3. InfinitePay retorna:
   - `checkout_url` (link para pagamento)
   - `invoice_slug` (identificador da invoice)

4. Sistema salva `checkout_url` no pedido e redireciona usuário

### 3. CHECKOUT INFINITEPAY
- Usuário realiza pagamento na plataforma InfinitePay
- InfinitePay processa pagamento (cartão, PIX, boleto, etc.)

### 4. WEBHOOK (POST /webhook/infinitepay)
**Quando InfinitePay envia webhook:**
1. Sistema recebe POST com dados do pagamento
2. Valida se `order_nsu` existe no banco
3. Salva na tabela `payments`:
   - `order_nsu`
   - `transaction_nsu`
   - `invoice_slug`
   - `amount`
   - `paid_amount`
   - `capture_method`
   - `receipt_url`
   - `status = "paid"`
   - `paid_at` (data/hora do pagamento)
   - `next_billing_date = paid_at + 30 dias`

4. Atualiza `orders.status` para "paid"
5. Responde HTTP 200 rapidamente (antes de processar tudo)

**Importante:** Webhook deve responder rápido, processamento pode ser assíncrono

### 5. CADASTRO (/register)
**Validações obrigatórias:**
1. Verifica se existe pagamento aprovado para o `order_nsu`
2. Verifica se NÃO existe usuário vinculado a esse `order_nsu`
3. Se ambas condições OK, permite cadastro

**Cadastro salva:**
- `nome`
- `email`
- `whatsapp`
- `senha` (hash)
- `order_nsu` (vincula ao pedido)
- `status = "ativo"`
- `subscription_status = "ativa"`
- `subscription_expires_at = next_billing_date` (do pagamento)

**Bloqueio:**
- Se tentar cadastrar sem pagamento → erro
- Se `order_nsu` já tem usuário → erro

### 6. LOGIN
**Validações:**
1. Verifica se usuário existe e senha está correta
2. Verifica `status = "ativo"`
3. Verifica `subscription_expires_at >= hoje`
4. Se vencido:
   - Bloqueia login
   - Mostra aviso: "Sua assinatura expirou. Renove para continuar usando."

**Liberação:**
- Se pagamento novo (webhook), libera automaticamente
- Atualiza `subscription_expires_at` e `subscription_status = "ativa"`

### 7. RENOVAÇÃO AUTOMÁTICA (Job Diário)
**Rotina que roda 1x por dia:**
1. Busca usuários com `subscription_expires_at < hoje`
2. Para cada usuário:
   - Atualiza `status = "bloqueado"`
   - Atualiza `subscription_status = "inadimplente"`
3. Usuário não consegue mais fazer login

**Quando pagar novamente (via webhook):**
- Sistema cria novo pagamento
- Verifica se já existe usuário para esse `order_nsu`
- Se existe, atualiza:
  - `status = "ativo"`
  - `subscription_status = "ativa"`
  - `subscription_expires_at = next_billing_date`
- Libera acesso automaticamente

### 8. PAINEL ADMINISTRATIVO
**Lista de usuários com:**
- Nome
- Email
- WhatsApp
- Status (ativo / bloqueado)
- Data do pagamento (último `paid_at`)
- Próxima renovação (`subscription_expires_at`)
- Valor pago (`paid_amount`)
- Forma de pagamento (`capture_method`)

**Ações:**
- Bloquear/Desbloquear manualmente
- Ver histórico de pagamentos
- Filtrar por status

---

## 🗄️ MODELO DAS TABELAS

### Tabela: orders
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_nsu UUID UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
    valor DECIMAL(10,2) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checkout_url TEXT,
    invoice_slug VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_nsu ON orders(order_nsu);
CREATE INDEX idx_orders_status ON orders(status);
```

### Tabela: payments
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_nsu UUID NOT NULL REFERENCES orders(order_nsu),
    user_id UUID REFERENCES users(id), -- NULL até cadastro
    transaction_nsu VARCHAR(255) NOT NULL,
    invoice_slug VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL,
    capture_method VARCHAR(50), -- credit_card, pix, boleto, etc.
    receipt_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'paid', -- paid, refunded
    paid_at TIMESTAMP NOT NULL,
    next_billing_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_nsu ON payments(order_nsu);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### Modificações na tabela: users
```sql
-- Campos a adicionar:
ALTER TABLE users ADD COLUMN IF NOT EXISTS order_nsu UUID REFERENCES orders(order_nsu);
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo'; -- ativo, bloqueado
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ativa'; -- ativa, inadimplente, cancelada
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at DATE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_order_nsu ON users(order_nsu);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
```

---

## 🔔 COMO O WEBHOOK FUNCIONA

### Fluxo do Webhook

1. **InfinitePay envia POST** para `/webhook/infinitepay`
   - Quando: Pagamento aprovado
   - Método: POST
   - Content-Type: application/json

2. **Payload recebido** (exemplo):
   ```json
   {
     "order_nsu": "uuid-do-pedido",
     "transaction_nsu": "trans-12345",
     "invoice_slug": "invoice-abc123",
     "amount": 50.00,
     "paid_amount": 50.00,
     "capture_method": "credit_card",
     "receipt_url": "https://...",
     "status": "paid",
     "paid_at": "2024-01-15T10:30:00Z"
   }
   ```

3. **Validações:**
   - Verificar se `order_nsu` existe no banco
   - Verificar se já não foi processado (evitar duplicação)
   - Validar dados obrigatórios

4. **Processamento:**
   - Salvar/Atualizar em `payments`
   - Atualizar `orders.status = "paid"`
   - Se usuário já existe, atualizar assinatura
   - Calcular `next_billing_date = paid_at + 30 dias`

5. **Resposta:**
   - HTTP 200 (OK) - Responde rápido
   - Processamento pode ser assíncrono se necessário

### Segurança do Webhook

1. **Validação de origem:**
   - Verificar IP de origem (se possível)
   - Usar header de autenticação (se InfinitePay enviar)

2. **Idempotência:**
   - Evitar processar mesmo pagamento 2x
   - Usar `transaction_nsu` como chave única

3. **Timeout:**
   - Responder em < 5 segundos
   - Processar tarefas pesadas depois

### Exemplo de Implementação

```javascript
router.post('/webhook/infinitepay', async (req, res) => {
  // 1. Responde rápido
  res.status(200).send('OK');
  
  // 2. Processa assincronamente
  setImmediate(async () => {
    try {
      const { order_nsu, transaction_nsu, ... } = req.body;
      
      // Valida order_nsu
      const order = await Order.findByOrderNsu(order_nsu);
      if (!order) {
        console.error('Order not found:', order_nsu);
        return;
      }
      
      // Verifica se já foi processado
      const existing = await Payment.findByTransactionNsu(transaction_nsu);
      if (existing) {
        console.log('Payment already processed');
        return;
      }
      
      // Salva pagamento
      await Payment.create({ order_nsu, transaction_nsu, ... });
      
      // Atualiza order
      await Order.updateStatus(order_nsu, 'paid');
      
      // Se já tem usuário, atualiza assinatura
      const user = await User.findByOrderNsu(order_nsu);
      if (user) {
        await User.updateSubscription(user.id, {
          status: 'ativa',
          expires_at: nextBillingDate
        });
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  });
});
```

---

## 🔐 PONTOS IMPORTANTES

1. **NÃO criar usuário antes do pagamento**
   - Cadastro só após pagamento confirmado

2. **NÃO liberar login sem pagamento**
   - Login verifica assinatura ativa

3. **Bloqueio automático por inadimplência**
   - Job diário verifica expiração
   - Bloqueia automaticamente

4. **Renovação automática**
   - Quando pagar novamente, libera automaticamente
   - Atualiza datas de expiração

5. **Segurança do webhook**
   - Validar origem
   - Evitar duplicação
   - Responder rápido

---

## 📝 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# InfinitePay
INFINITEPAY_HANDLE=lucas-rodrigues-740
INFINITEPAY_API_KEY=sua-api-key-aqui (se necessário)
APP_URL=https://departamento-pessoal.onrender.com
WEBHOOK_SECRET=seu-secret-para-validar-webhook (se InfinitePay usar)
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

1. Criar migrations (tabelas orders, payments, campos users)
2. Criar models (Order, Payment)
3. Criar service InfinitePay (integração API)
4. Criar controller /adquirir (criar pedido e link)
5. Criar webhook handler
6. Modificar cadastro (verificar pagamento)
7. Modificar login (verificar assinatura)
8. Criar job de inadimplência
9. Criar painel admin

