# 🔍 DEBUG: Link de Pagamento Null

## ❌ Erro
```
Erro ao redirecionar para página de pagamento: Não foi possível gerar link de pagamento. 
Status: pendente, Link: null. Verifique se o InfinitePay está configurado corretamente.
```

---

## 🔍 COMO DIAGNOSTICAR

### 1. Verifique os Logs do Servidor

Quando você tentar assinar, os logs devem mostrar:

```
📤 Enviando requisição para InfinitePay: { ... }
📥 Resposta completa da API InfinitePay: { ... }
📦 Resultado do InfinitePay: { ... }
```

### 2. Verifique as Variáveis de Ambiente

No seu `.env` ou no Render, verifique:

```env
INFINITEPAY_HANDLE=lucas-rodrigues-740
INFINITEPAY_USE_MOCK=false
APP_URL=https://seu-app.onrender.com
```

### 3. Possíveis Causas

#### A) Modo MOCK Ativado
**Sintoma:** Logs mostram `🔧 [MOCK]` ou `useMock: true`

**Solução:**
```env
INFINITEPAY_USE_MOCK=false
```

#### B) Handle Não Configurado
**Sintoma:** Logs mostram `⚠️ INFINITEPAY_HANDLE não configurado`

**Solução:**
```env
INFINITEPAY_HANDLE=lucas-rodrigues-740
```

#### C) API Retornou Erro
**Sintoma:** Logs mostram `❌ InfinitePay retornou erro` ou `❌ Erro na requisição HTTP`

**Solução:**
- Verifique se o handle está correto
- Verifique se a API do InfinitePay está acessível
- Verifique se há problemas de conexão

#### D) Resposta da API em Formato Diferente
**Sintoma:** Logs mostram `📥 Resposta completa da API InfinitePay` mas não encontra o link

**Solução:**
- Verifique os logs para ver a estrutura completa da resposta
- O sistema tenta encontrar o link em vários formatos:
  - `apiResponse.link`
  - `apiResponse.data.link`
  - `apiResponse.checkout_url`
  - `apiResponse.url`
  - `apiResponse.payment_link`

---

## 🛠️ PASSOS PARA RESOLVER

### Passo 1: Verifique os Logs

1. Tente assinar novamente
2. Copie TODOS os logs do servidor que aparecem
3. Procure por:
   - `📤 Enviando requisição`
   - `📥 Resposta completa`
   - `❌ Erro`
   - `🔧 [MOCK]`

### Passo 2: Verifique a Configuração

Execute no terminal:
```bash
node -e "console.log('Handle:', process.env.INFINITEPAY_HANDLE); console.log('UseMock:', process.env.INFINITEPAY_USE_MOCK); console.log('AppUrl:', process.env.APP_URL);"
```

### Passo 3: Teste a API Manualmente

Se possível, teste a API do InfinitePay diretamente:

```bash
curl -X POST https://api.infinitepay.io/invoices/public/checkout/links \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "lucas-rodrigues-740",
    "itens": [{
      "quantity": 1,
      "price": 1990,
      "description": "Teste"
    }]
  }'
```

---

## 📋 INFORMAÇÕES NECESSÁRIAS PARA DEBUG

Se o problema persistir, envie:

1. **Logs completos do servidor** quando tentar assinar
2. **Variáveis de ambiente** (sem senhas):
   - `INFINITEPAY_HANDLE`
   - `INFINITEPAY_USE_MOCK`
   - `APP_URL`
3. **Resposta completa da API** (se aparecer nos logs)

---

## ✅ CHECKLIST

- [ ] `INFINITEPAY_HANDLE` está configurado
- [ ] `INFINITEPAY_USE_MOCK=false` (não está em modo MOCK)
- [ ] `APP_URL` está configurado corretamente
- [ ] Logs mostram requisição sendo enviada
- [ ] Logs mostram resposta da API
- [ ] Não há erros de conexão nos logs

---

## 🔗 DOCUMENTAÇÃO RELACIONADA

- [Como Configurar InfinitePay](./COMO_CONFIGURAR_INFINITEPAY.md)
- [Integração InfinitePay API REST](./INTEGRACAO_INFINITEPAY_API_REST.md)

