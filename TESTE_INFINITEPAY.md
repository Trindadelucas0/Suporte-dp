# 🧪 Teste de Comunicação com InfinitePay

## Problema Identificado

O webhook está sendo rejeitado porque:
1. O payload não contém o campo `status: 'paid'`
2. O payload pode não ter `paid_at`

## Correção Aplicada

### 1. Validação do Webhook Ajustada

O código agora aceita pagamentos mesmo sem o campo `status` explicitamente, desde que tenha:
- `transaction_nsu`
- `paid_amount` ou `amount`

### 2. Tratamento de `paid_at`

Se o payload não tiver `paid_at`, o sistema usa a data/hora atual como fallback.

## Como Testar

### Opção 1: Script de Teste
```bash
node scripts/test-infinitepay-connection.js
```

### Opção 2: Teste Manual

1. **Criar um pedido de teste:**
   - Acesse `/checkout`
   - Gere um link de pagamento
   - Verifique os logs do servidor

2. **Verificar logs do webhook:**
   - Faça um pagamento de teste
   - Verifique os logs para ver se o webhook é processado

## Logs Esperados

### Webhook Válido:
```
Webhook InfinitePay recebido: {
  order_nsu: 'xxx',
  transaction_nsu: 'xxx',
  amount: 1990
}
✅ Webhook InfinitePay processado com sucesso
```

### Webhook Inválido (ANTES):
```
InfinitePay - Webhook com status diferente de paid: undefined
Webhook InfinitePay inválido: { ... }
```

### Webhook Válido (AGORA):
```
✅ Webhook InfinitePay válido (sem status, mas com campos obrigatórios)
✅ Webhook InfinitePay processado com sucesso
```

