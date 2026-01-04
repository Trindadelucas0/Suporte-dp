# 🔧 Correção para Produção - Erro InfinitePay

## ❌ Problema Identificado

O erro "Total price must be greater than 1" está ocorrendo mesmo enviando valores válidos (19.90 ou 50).

## 🔍 Possíveis Causas

1. **Formato do valor**: A API pode esperar número inteiro (centavos) ao invés de decimal
2. **Estrutura do items**: Pode estar faltando algum campo obrigatório
3. **Ordem dos campos**: A API pode ser sensível à ordem dos campos
4. **Validação interna**: A API pode ter validações específicas que não estamos atendendo

## ✅ Soluções a Testar

### Opção 1: Converter para Centavos (Mais Provável)

A API InfinitePay pode esperar valores em **centavos** ao invés de reais:

```javascript
// Converter reais para centavos
const valorEmCentavos = Math.round(valorNumerico * 100); // 19.90 -> 1990
```

### Opção 2: Garantir Formato de Número

Garantir que o valor seja um número, não string:

```javascript
const valorNumerico = Number(parseFloat(valor).toFixed(2));
```

### Opção 3: Verificar Estrutura do Items

A API pode exigir campos adicionais no items:

```javascript
items: [
  {
    quantity: 1,
    price: valorNumerico,
    description: descricao,
    // Pode precisar de:
    // name: descricao,
    // amount: valorNumerico,
    // etc.
  }
]
```

## 🚀 Próximos Passos

1. **Testar com valor em centavos** (1990 para R$ 19,90)
2. **Verificar documentação da API InfinitePay**
3. **Contatar suporte InfinitePay** se necessário
4. **Testar com diferentes valores** para identificar padrão

## 📝 Nota Importante

O código em produção parece estar usando ainda o valor antigo (50). Certifique-se de que:
1. O código foi atualizado para 19.90
2. O servidor foi reiniciado após o deploy
3. Não há cache de código antigo

