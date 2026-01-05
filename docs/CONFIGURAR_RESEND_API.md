# 🔧 Configurar Resend API no Render (Solução para Timeout)

## ⚠️ Problema

O Render bloqueia conexões SMTP, causando timeout ao enviar emails.

## ✅ Solução: Usar API do Resend

O sistema agora suporta **API do Resend** (mais confiável que SMTP no Render).

---

## 🚀 Configuração no Render

### 1️⃣ Adicionar Variável de Ambiente

No painel do Render, adicione:

```
RESEND_API_KEY = re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

**⚠️ IMPORTANTE:** Use sua API Key do Resend (começa com `re_`)

### 2️⃣ Manter SMTP_FROM

Mantenha também:

```
SMTP_FROM = noreply@pixsile.resend.app
```

---

## 🔄 Como Funciona

O sistema detecta automaticamente:

- **Se `RESEND_API_KEY` está configurado:**
  - ✅ Usa **API do Resend** (recomendado para Render)
  - ✅ Não usa SMTP (evita timeout)
  - ✅ Mais rápido e confiável

- **Se `RESEND_API_KEY` NÃO está configurado:**
  - Usa SMTP tradicional (para desenvolvimento local)

---

## 📋 Variáveis Necessárias no Render

```env
RESEND_API_KEY=re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
SMTP_FROM=noreply@pixsile.resend.app
```

**Opcional (para fallback SMTP):**
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

---

## ✅ Vantagens da API do Resend

- ✅ **Não depende de SMTP** (evita timeout no Render)
- ✅ **Mais rápido** (requisição HTTP direta)
- ✅ **Mais confiável** (não bloqueado por firewall)
- ✅ **Melhor para produção** (especialmente no Render)

---

## 🧪 Testar

Após configurar, faça um pagamento de teste e verifique os logs:

```
✅ EmailService: Usando API do Resend (recomendado para Render)
✅ EmailService (Resend API): Token de pagamento enviado para: email@exemplo.com
📬 EmailService (Resend API): Message ID: abc123...
```

---

## 🔍 Verificar se Está Funcionando

Nos logs do Render, você verá:

**✅ Funcionando (API do Resend):**
```
✅ EmailService: Usando API do Resend (recomendado para Render)
✅ EmailService (Resend API): Token de pagamento enviado
```

**❌ Problema (ainda usando SMTP):**
```
❌ EmailService: Erro ao enviar email de token: Connection timeout
```

---

## ✨ Pronto!

Após configurar `RESEND_API_KEY` no Render, os emails devem funcionar sem timeout!

