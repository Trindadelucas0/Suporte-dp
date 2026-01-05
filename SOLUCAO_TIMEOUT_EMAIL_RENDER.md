# ⚠️ Solução: Timeout de Email no Render

## 🔍 Problema

O sistema está tentando usar **SMTP** ao invés da **API do Resend**, causando timeout no Render.

**Erro:**
```
❌ EmailService: Erro ao enviar email de token: Connection timeout
❌ EmailService: Código do erro: ETIMEDOUT
```

---

## ✅ Solução: Configurar RESEND_API_KEY no Render

### **Passo 1: Adicionar Variável no Render**

No painel do Render, adicione:

```
RESEND_API_KEY = re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

**⚠️ IMPORTANTE:** Use sua API Key do Resend (começa com `re_`)

### **Passo 2: Manter SMTP_FROM**

Mantenha também:

```
SMTP_FROM = noreply@pixsile.resend.app
```

---

## 🔄 Como Funciona Agora

O sistema detecta automaticamente:

1. **Se `RESEND_API_KEY` está configurado:**
   - ✅ Usa **API do Resend** (HTTP - não bloqueado no Render)
   - ✅ Não usa SMTP
   - ✅ Funciona no plano gratuito

2. **Se `RESEND_API_KEY` NÃO está configurado:**
   - ❌ Tenta usar SMTP (bloqueado no Render - timeout)
   - ❌ Não funciona no plano gratuito

---

## 📋 Variáveis Necessárias no Render

**Mínimo necessário:**
```env
RESEND_API_KEY=re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
SMTP_FROM=noreply@pixsile.resend.app
```

**Opcional (para fallback SMTP local):**
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

---

## 🔍 Verificar se Está Funcionando

### **Nos Logs do Render, você verá:**

**✅ Funcionando (API do Resend):**
```
🔍 EmailService: Verificando configuração de email...
   - Resend instalado: ✅ SIM
   - RESEND_API_KEY configurado: ✅ SIM
✅ EmailService: Usando API do Resend (recomendado para Render)
📧 EmailService: Usando API do Resend para enviar email
✅ EmailService (Resend API): Token de pagamento enviado
```

**❌ Problema (ainda usando SMTP):**
```
🔍 EmailService: Verificando configuração de email...
   - Resend instalado: ✅ SIM
   - RESEND_API_KEY configurado: ❌ NÃO
📧 EmailService: Usando SMTP tradicional (pode ter timeout no Render)
❌ EmailService: Erro ao enviar email de token: Connection timeout
```

---

## 🛠️ Passos para Resolver

1. **Acesse o Render:** https://dashboard.render.com/
2. **Selecione seu serviço** (Web Service)
3. **Vá em Environment**
4. **Adicione a variável:**
   - Nome: `RESEND_API_KEY`
   - Valor: `re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE`
5. **Salve** (o Render reinicia automaticamente)
6. **Aguarde o deploy** (1-2 minutos)
7. **Verifique os logs** - deve aparecer "Usando API do Resend"

---

## ✅ Após Configurar

Os emails devem funcionar sem timeout!

O sistema agora:
- ✅ Detecta automaticamente a API do Resend
- ✅ Usa API ao invés de SMTP
- ✅ Funciona no plano gratuito do Render
- ✅ Não tem timeout

---

## 🆘 Se Ainda Não Funcionar

1. **Verifique os logs do Render** após adicionar `RESEND_API_KEY`
2. **Procure por:** "Usando API do Resend"
3. **Se não aparecer:** Verifique se a variável foi salva corretamente
4. **Reinicie o serviço** manualmente se necessário

---

## 📝 Nota

O código foi atualizado para:
- ✅ Verificar `RESEND_API_KEY` a cada envio (não só no startup)
- ✅ Adicionar logs detalhados para diagnóstico
- ✅ Priorizar API do Resend sobre SMTP

---

**Última atualização:** 2024-01-XX

