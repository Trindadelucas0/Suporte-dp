# 🔧 ATUALIZAR ARQUIVO .ENV

## ✅ O QUE ADICIONAR NO .ENV

Adicione estas linhas na seção de configurações do InfinitePay:

```env
# Link fixo de checkout (FALLBACK - usado quando API REST não funciona)
INFINITEPAY_CHECKOUT_LINK=https://checkout.infinitepay.io/lucas-rodrigues-740/70tTkpWp0Z
```

---

## 📋 CONFIGURAÇÃO COMPLETA DO INFINITEPAY

Seu `.env` deve ter esta seção completa:

```env
# ============================================
# CONFIGURAÇÕES INFINITEPAY
# ============================================
# Handle (InfiniteTag) - OBRIGATÓRIO (sem o $)
INFINITEPAY_HANDLE=lucas-rodrigues-740

# Modo MOCK (para testes - desabilita API real)
INFINITEPAY_USE_MOCK=false

# Link fixo de checkout (FALLBACK - usado quando API REST não funciona)
INFINITEPAY_CHECKOUT_LINK=https://checkout.infinitepay.io/lucas-rodrigues-740/70tTkpWp0Z

# Link fixo de plano (FALLBACK ALTERNATIVO - opcional)
# INFINITEPAY_PLAN_LINK=https://invoice.infinitepay.io/plans/lucas-rodrigues-740/G6bTNvSgv

# Webhook Secret (opcional - para validar webhooks)
# INFINITEPAY_WEBHOOK_SECRET=seu-webhook-secret-aqui
```

---

## 🎯 ONDE ADICIONAR

### Se estiver usando Render.com:

1. Acesse seu projeto no Render
2. Vá em **Environment** (Variáveis de Ambiente)
3. Clique em **Add Environment Variable**
4. Adicione:
   - **Key:** `INFINITEPAY_CHECKOUT_LINK`
   - **Value:** `https://checkout.infinitepay.io/lucas-rodrigues-740/70tTkpWp0Z`
5. Clique em **Save Changes**
6. O Render reiniciará automaticamente

### Se estiver usando arquivo `.env` local:

1. Abra o arquivo `.env` na raiz do projeto
2. Procure a seção `# CONFIGURAÇÕES INFINITEPAY`
3. Adicione a linha:
   ```env
   INFINITEPAY_CHECKOUT_LINK=https://checkout.infinitepay.io/lucas-rodrigues-740/70tTkpWp0Z
   ```
4. Salve o arquivo
5. Reinicie o servidor

---

## ✅ VERIFICAÇÃO

Após adicionar, verifique se está funcionando:

1. Reinicie o servidor
2. Tente assinar novamente
3. Verifique os logs - deve aparecer:
   - Se API REST funcionar: `✅ Link de pagamento InfinitePay criado`
   - Se API REST falhar: `✅ Usando link fixo de checkout como fallback`

---

## 🔍 POR QUE ISSO É IMPORTANTE?

- **Garante que sempre haverá um link de pagamento** mesmo se a API REST falhar
- **Evita o erro "Link: null"**
- **Melhora a experiência do usuário** - sempre consegue pagar
- **Fallback automático** - não precisa intervenção manual

---

## 📝 NOTAS

- O link de checkout é **recomendado** (mais direto)
- O link de plano é **alternativa** (se checkout não funcionar)
- O sistema **sempre tenta a API REST primeiro**
- Só usa o link fixo se a API REST falhar

