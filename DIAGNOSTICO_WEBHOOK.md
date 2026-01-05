# 🔍 Diagnóstico: Webhook Não Está Processando Pagamento

## ⚠️ Problema Identificado

**Situação:**
- ✅ Order criado: `5d34b637-4f1f-481e-98a1-d6a1d3a677c6`
- ✅ Status: `pending`
- ❌ **NENHUM pagamento processado**
- ❌ **NENHUM token gerado**

**Isso indica que o webhook NÃO foi recebido ou NÃO processou corretamente.**

---

## 🔍 Verificações Necessárias

### 1️⃣ Verificar Logs do Render

No painel do Render, vá em **Logs** e procure por:

**✅ Se o webhook foi recebido, você verá:**
```
🔔 [WEBHOOK] Requisição recebida
📥 [WEBHOOK] Webhook InfinitePay recebido
```

**❌ Se NÃO aparecer nada, o webhook não está chegando ao servidor.**

---

### 2️⃣ Verificar URL do Webhook no InfinitePay

**URL do webhook deve ser:**
```
https://departamento-pessoal.onrender.com/webhook/infinitepay
```

**Verifique no painel do InfinitePay:**
1. Acesse configurações do InfinitePay
2. Verifique a URL do webhook configurada
3. Confirme que está apontando para o Render (não localhost)

---

### 3️⃣ Verificar se o Pagamento Foi Confirmado no InfinitePay

1. Acesse o painel do InfinitePay
2. Verifique se o pagamento aparece como **"Pago"** ou **"Confirmado"**
3. Verifique se há tentativas de webhook registradas

---

### 4️⃣ Verificar Erros no Webhook

**Se o webhook foi recebido mas falhou, você verá nos logs:**

**Erro de validação:**
```
❌ [WEBHOOK] Webhook InfinitePay inválido
```

**Erro de order não encontrado:**
```
❌ [WEBHOOK] Webhook InfinitePay - Pedido não encontrado
```

**Erro de processamento:**
```
❌ Erro ao processar webhook InfinitePay
```

---

## 🛠️ Soluções

### **Solução 1: Webhook Não Está Sendo Chamado**

**Se não há logs do webhook no Render:**

1. Verifique a URL do webhook no InfinitePay
2. Teste manualmente o webhook (se InfinitePay permitir)
3. Verifique se o InfinitePay está tentando chamar o webhook

---

### **Solução 2: Webhook Está Sendo Rejeitado**

**Se aparece "Webhook inválido":**

1. Verifique a validação do webhook em `services/infinitepayService.js`
2. Verifique se há `INFINITEPAY_WEBHOOK_SECRET` configurado
3. Se não há secret, a validação pode estar falhando

---

### **Solução 3: Order Não Encontrado**

**Se aparece "Pedido não encontrado":**

1. Verifique se o `order_nsu` no webhook corresponde ao order criado
2. Verifique se o order foi criado antes do pagamento
3. Verifique se há algum problema na criação do order

---

### **Solução 4: Processar Pagamento Manualmente (Temporário)**

Se o webhook não está funcionando, você pode processar manualmente:

```sql
-- 1. Atualizar order para "paid"
UPDATE orders 
SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
WHERE order_nsu = '5d34b637-4f1f-481e-98a1-d6a1d3a677c6';

-- 2. Criar pagamento manualmente (ajuste os valores)
INSERT INTO payments (
  order_nsu, user_id, transaction_nsu, invoice_slug, 
  amount, paid_amount, capture_method, receipt_url, 
  status, paid_at, next_billing_date
)
VALUES (
  '5d34b637-4f1f-481e-98a1-d6a1d3a677c6',
  'c8d9e18a-db6f-4c71-ba30-fbfce8fbfd48',
  'MANUAL-' || NOW()::text,
  'manual',
  1990,
  1990,
  'manual',
  NULL,
  'paid',
  NOW(),
  (NOW() + INTERVAL '30 days')::date
);

-- 3. Gerar token (execute o script)
node scripts/gerar-tokens-para-usuarios.js
```

**⚠️ Isso é temporário!** O problema real precisa ser resolvido.

---

## 📋 Checklist de Diagnóstico

- [ ] Verificar logs do Render para webhook
- [ ] Verificar URL do webhook no InfinitePay
- [ ] Verificar se pagamento está confirmado no InfinitePay
- [ ] Verificar se há erros nos logs do webhook
- [ ] Verificar se order_nsu está correto
- [ ] Verificar validação do webhook
- [ ] Testar webhook manualmente (se possível)

---

## 🔧 Próximos Passos

1. **Verifique os logs do Render** - procure por mensagens de webhook
2. **Verifique a URL do webhook** no InfinitePay
3. **Teste fazer um novo pagamento** e monitore os logs em tempo real
4. **Se necessário, processe manualmente** (solução temporária)

---

## 📝 Logs Adicionados

Adicionei logs detalhados no webhook para facilitar diagnóstico:

- `🔔 [WEBHOOK] Requisição recebida` - quando chega requisição
- `📥 [WEBHOOK] Webhook InfinitePay recebido` - quando processa
- `🔍 [WEBHOOK] Validação do webhook` - resultado da validação
- `🔍 [WEBHOOK] Busca do order` - se order foi encontrado

Verifique esses logs no Render após fazer um pagamento.

