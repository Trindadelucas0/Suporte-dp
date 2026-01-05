# 🔧 Configuração Resend - Exemplo Prático

## ✅ Sua API Key do Resend:
```
re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

---

## 📧 O que é SMTP_FROM?

O `SMTP_FROM` é o **email remetente** que aparece nos emails enviados. É o email que o destinatário vê como "De:".

---

## 🎯 Duas Opções:

### **Opção 1: Usar Domínio de Teste do Resend (MAIS RÁPIDO - Para Testes)**

Use o email de teste do Resend que funciona imediatamente:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
SMTP_FROM=noreply@pixsile.resend.app
```

**✅ Vantagens:**
- Funciona imediatamente
- Não precisa verificar domínio
- Perfeito para testes
- Você pode usar qualquer nome antes do @ (ex: `noreply@`, `contato@`, `suporte@`)

**⚠️ Limitações:**
- Apenas para testes
- Pode ter limitações de volume

---

### **Opção 2: Usar Seu Próprio Domínio (RECOMENDADO - Para Produção)**

Se você tem um domínio próprio (ex: `seudominio.com`, `meusite.com.br`), você pode usar:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
SMTP_FROM=noreply@seudominio.com
```

**⚠️ IMPORTANTE:**
- Você precisa **verificar o domínio** no Resend primeiro
- Substitua `seudominio.com` pelo seu domínio real

**Como verificar domínio no Resend:**
1. Acesse: https://resend.com/domains
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `seudominio.com`)
4. Adicione os registros DNS que o Resend fornecer
5. Aguarde verificação (pode levar alguns minutos)

---

## 🚀 Configuração Completa no Render

### **Para Testes (Use Agora):**

No painel do Render, adicione estas variáveis:

```
SMTP_HOST = smtp.resend.com
```

```
SMTP_PORT = 587
```

```
SMTP_USER = resend
```

```
SMTP_PASS = re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

```
SMTP_FROM = noreply@pixsile.resend.app
```

**💡 Você pode usar qualquer nome antes do @:**
- `noreply@pixsile.resend.app`
- `contato@pixsile.resend.app`
- `suporte@pixsile.resend.app`
- `teste@pixsile.resend.app`
- etc.

---

### **Para Produção (Depois de Verificar Domínio):**

Se você tem um domínio próprio (ex: `meusite.com.br`), use:

```
SMTP_FROM = noreply@meusite.com.br
```

Ou qualquer outro email do seu domínio:
- `noreply@meusite.com.br`
- `contato@meusite.com.br`
- `suporte@meusite.com.br`
- etc.

**⚠️ IMPORTANTE:** O domínio precisa estar verificado no Resend!

---

## 📝 Exemplos Práticos

### Exemplo 1: Você tem domínio `exemplo.com.br`
```env
SMTP_FROM=noreply@exemplo.com.br
```

### Exemplo 2: Você tem domínio `meusite.net`
```env
SMTP_FROM=noreply@meusite.net
```

### Exemplo 3: Você NÃO tem domínio (use o de teste)
```env
SMTP_FROM=onboarding@resend.dev
```

---

## ✅ Resumo

**Para começar AGORA (testes):**
- Use: `SMTP_FROM=noreply@pixsile.resend.app`
- Funciona imediatamente
- Não precisa verificar nada
- Você pode usar qualquer nome antes do @ (ex: `contato@pixsile.resend.app`)

**Para produção (depois):**
- Verifique seu domínio no Resend
- Use: `SMTP_FROM=noreply@seudominio.com`
- Substitua `seudominio.com` pelo seu domínio real

---

## 🎯 Recomendação

**Comece com:**
```
SMTP_FROM=noreply@pixsile.resend.app
```

Isso vai funcionar imediatamente para testes. Você pode usar qualquer nome antes do @:
- `noreply@pixsile.resend.app` ✅
- `contato@pixsile.resend.app` ✅
- `suporte@pixsile.resend.app` ✅

Depois, quando quiser usar seu próprio domínio, verifique o domínio no Resend e mude para:
```
SMTP_FROM=noreply@seudominio.com
```

---

## ✨ Pronto!

Configure no Render e teste! Os emails devem funcionar imediatamente com `onboarding@resend.dev`.

