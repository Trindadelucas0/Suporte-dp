# 🔧 COMO CONFIGURAR INFINITEPAY

## ✅ RESPOSTA RÁPIDA

**NÃO, você NÃO precisa adicionar link de checkout ou planos!**

O sistema usa a **API REST do InfinitePay** que cria links de pagamento **automaticamente** para cada cobrança.

---

## 📋 O QUE VOCÊ PRECISA CONFIGURAR

### 1. Variáveis de Ambiente Obrigatórias

No arquivo `.env` (ou nas variáveis de ambiente do Render), configure:

```env
# OBRIGATÓRIO: Seu handle (InfiniteTag) sem o símbolo $
INFINITEPAY_HANDLE=lucas-rodrigues-740

# OBRIGATÓRIO: URL do seu app (para webhooks e redirects)
APP_URL=https://seu-app.onrender.com

# OPCIONAL: Modo MOCK (para testes)
INFINITEPAY_USE_MOCK=false

# OPCIONAL: Webhook secret (para validar webhooks)
# INFINITEPAY_WEBHOOK_SECRET=seu-secret-aqui
```

### 2. Como Funciona

O sistema **automaticamente**:

1. ✅ Cria link de pagamento via API REST quando necessário
2. ✅ Envia dados do cliente para o InfinitePay
3. ✅ Configura `redirect_url` e `webhook_url` automaticamente
4. ✅ Recebe confirmação de pagamento via webhook

**Você NÃO precisa:**
- ❌ Adicionar link fixo de checkout
- ❌ Adicionar link de planos
- ❌ Configurar URLs manualmente

---

## 🔄 DIFERENÇA: API REST vs PLANOS FIXOS

### Opção 1: API REST (Atual - Recomendado) ✅

**Como funciona:**
- Sistema cria link único para cada cobrança
- Cada cliente tem seu próprio link de pagamento
- Dados do cliente são enviados automaticamente
- Webhook configurado automaticamente

**Vantagens:**
- ✅ Links únicos por cobrança
- ✅ Rastreamento individual
- ✅ Dados do cliente pré-preenchidos
- ✅ Webhook automático

**Configuração:**
```env
INFINITEPAY_HANDLE=lucas-rodrigues-740
APP_URL=https://seu-app.onrender.com
```

### Opção 2: Link Fixo de Planos (Alternativa)

**Como funciona:**
- Usa um link fixo: `https://invoice.infinitepay.io/plans/{handle}/{planId}`
- Todos os clientes usam o mesmo link
- Dados são passados via query parameters

**Desvantagens:**
- ❌ Não tem webhook automático
- ❌ Não rastreia pagamentos individualmente
- ❌ Dados do cliente não são pré-preenchidos

**Quando usar:**
- Apenas se a API REST não funcionar
- Para testes rápidos

---

## ✅ CONFIGURAÇÃO ATUAL (RECOMENDADA)

O sistema está configurado para usar **API REST**, que é a melhor opção.

**Você só precisa:**

1. ✅ Configurar `INFINITEPAY_HANDLE` no `.env`
2. ✅ Configurar `APP_URL` no `.env`
3. ✅ Garantir que o webhook está acessível em `/webhook/infinitepay`

**Pronto!** O sistema cria os links automaticamente.

---

## 🧪 COMO TESTAR

### 1. Verificar Configuração

```bash
# Verifique se as variáveis estão configuradas
echo $INFINITEPAY_HANDLE
echo $APP_URL
```

### 2. Testar Criação de Link

1. Acesse `/adquirir` no seu sistema
2. Preencha os dados
3. Clique em "Continuar para Pagamento"
4. O sistema deve redirecionar para o InfinitePay

### 3. Verificar Logs

Os logs devem mostrar:
```
📤 Enviando requisição para InfinitePay: { ... }
✅ Link de pagamento InfinitePay criado: { ... }
```

---

## ❓ PERGUNTAS FREQUENTES

### Preciso criar um plano no InfinitePay?

**Não!** A API REST cria links de pagamento sem precisar criar planos.

### O link de planos que eu tenho serve?

O link `https://invoice.infinitepay.io/plans/lucas-rodrigues-740/G6bTNvSgv` é uma alternativa, mas:
- ❌ Não tem webhook automático
- ❌ Não rastreia pagamentos individualmente
- ❌ Não pré-preenche dados do cliente

**Recomendação:** Use a API REST (já configurada).

### Como configuro o webhook no InfinitePay?

O sistema **automaticamente** envia a `webhook_url` na requisição:
```
webhook_url: "https://seu-app.onrender.com/webhook/infinitepay"
```

Você não precisa configurar manualmente no painel do InfinitePay.

### E se a API REST não funcionar?

Se a API REST não funcionar, você pode:
1. Verificar se o `INFINITEPAY_HANDLE` está correto
2. Verificar se o `APP_URL` está correto
3. Verificar os logs do servidor para erros
4. Contatar suporte do InfinitePay

---

## 📝 RESUMO

✅ **Você NÃO precisa adicionar link de checkout ou planos**

✅ **Você só precisa:**
- `INFINITEPAY_HANDLE` (seu handle sem o $)
- `APP_URL` (URL do seu app)

✅ **O sistema cria tudo automaticamente via API REST**

---

## 🔗 DOCUMENTAÇÃO COMPLETA

- [Integração InfinitePay API REST](./INTEGRACAO_INFINITEPAY_API_REST.md)
- [Como Funciona o Fluxo Completo](./COMO_FUNCIONA_FLUXO_COMPLETO.md)
- [Como Configurar APP_URL](./COMO_CONFIGURAR_APP_URL.md)

