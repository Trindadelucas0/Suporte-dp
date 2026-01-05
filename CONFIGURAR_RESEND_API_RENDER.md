# 🚀 Configurar Resend API no Render (URGENTE)

## ⚠️ Problema Atual

O sistema está tentando usar **SMTP** e dando timeout no Render.

**Erro nos logs:**
```
❌ EmailService: Erro ao enviar email de token: Connection timeout
❌ EmailService: Código do erro: ETIMEDOUT
```

---

## ✅ Solução: Adicionar RESEND_API_KEY no Render

### **Passo a Passo:**

1. **Acesse:** https://dashboard.render.com/
2. **Selecione seu serviço** (Web Service)
3. **Clique em "Environment"** (no menu lateral)
4. **Clique em "Add Environment Variable"**
5. **Configure:**

   **Nome da variável:**
   ```
   RESEND_API_KEY
   ```

   **Valor:**
   ```
   re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
   ```

6. **Clique em "Save Changes"**
7. **Aguarde o deploy** (1-2 minutos)

---

## 📋 Variáveis que Devem Estar no Render

**Obrigatório:**
```
RESEND_API_KEY = re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
SMTP_FROM = noreply@pixsile.resend.app
```

**Opcional (pode remover se quiser):**
```
SMTP_HOST = smtp.resend.com
SMTP_PORT = 587
SMTP_USER = resend
SMTP_PASS = re_DTQJ4DTE_9uZqzWpxtTt32iQbLyEe3etE
```

---

## ✅ Como Verificar se Funcionou

### **Após adicionar `RESEND_API_KEY` e reiniciar, verifique os logs:**

**✅ Deve aparecer:**
```
🔍 EmailService: Verificando configuração de email...
   - Resend instalado: ✅ SIM
   - RESEND_API_KEY configurado: ✅ SIM
✅ EmailService: Usando API do Resend (recomendado para Render)
```

**Quando enviar email:**
```
📧 EmailService: Usando API do Resend para enviar email
✅ EmailService (Resend API): Token de pagamento enviado
```

**❌ Se ainda aparecer:**
```
📧 EmailService: Usando SMTP tradicional (RESEND_API_KEY não configurado)
```

**Significa que a variável não foi salva corretamente ou o servidor não reiniciou.**

---

## 🔄 Após Configurar

1. **Aguarde o deploy finalizar** (1-2 minutos)
2. **Faça um pagamento de teste**
3. **Verifique os logs** - deve aparecer "Usando API do Resend"
4. **Verifique se o email foi enviado**

---

## ⚡ Por que Isso Resolve?

- **SMTP** = Bloqueado no Render (timeout)
- **API do Resend** = HTTP/HTTPS (funciona no Render)

O sistema detecta automaticamente `RESEND_API_KEY` e usa a API ao invés de SMTP.

---

## 🆘 Se Ainda Não Funcionar

1. Verifique se `RESEND_API_KEY` está salva no Render
2. Verifique se o servidor reiniciou (deploy concluído)
3. Verifique os logs para ver qual método está sendo usado
4. Tente reiniciar manualmente o serviço no Render

---

**⚠️ IMPORTANTE:** Sem `RESEND_API_KEY` configurado, o sistema tentará usar SMTP e dará timeout no Render!

