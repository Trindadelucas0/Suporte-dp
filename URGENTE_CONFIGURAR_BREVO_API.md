# ⚠️ URGENTE: Configurar BREVO_API_KEY no Render

## 🔴 Problema Atual

O sistema está usando **SMTP** e dando timeout porque `BREVO_API_KEY` **NÃO está configurado** no Render.

**Log mostra:**
```
📧 EmailService: Usando SMTP tradicional para notificação (BREVO_API_KEY não configurado)
❌ EmailService: Erro ao enviar notificação de novo usuário: Connection timeout
```

---

## ✅ Solução: Configurar BREVO_API_KEY

### **Passo 1: Obter API Key do Brevo**

1. **Acesse:** https://www.brevo.com/
2. **Faça login**
3. **Vá em:** Settings > SMTP & API
4. **Em "API Keys":**
   - Clique em **"Generate new key"**
   - Dê um nome: **"Suporte DP Render"**
   - Clique em **"Generate"**
   - **⚠️ COPIE A API KEY** (começa com `xkeysib-...`)
   - Você não verá novamente!

---

### **Passo 2: Configurar no Render**

1. **Acesse:** https://dashboard.render.com/
2. **Selecione seu serviço** (Web Service)
3. **Vá em "Environment"**
4. **Clique em "Add Environment Variable"**
5. **Configure:**

   **Nome:**
   ```
   BREVO_API_KEY
   ```

   **Valor:**
   ```
   xkeysib-sua-api-key-aqui
   ```
   (Cole a API Key que você copiou do Brevo)

6. **Também configure (se ainda não tiver):**

   **Nome:**
   ```
   SMTP_FROM
   ```

   **Valor:**
   ```
   seu-email@brevo.com
   ```
   (Use o email da sua conta Brevo)

7. **Salve** (o Render reinicia automaticamente)

---

### **Passo 3: Aguardar Deploy**

1. **Aguarde 1-2 minutos** para o deploy finalizar
2. **O Render vai instalar** o pacote `@getbrevo/brevo` automaticamente
3. **Verifique os logs** - deve aparecer:

   ```
   ✅ EmailService: Usando API HTTP do Brevo (recomendado para Render)
   ```

---

## ✅ Como Verificar se Funcionou

### **Nos Logs do Render:**

**✅ Funcionando:**
```
✅ EmailService: Usando API HTTP do Brevo (recomendado para Render)
📧 EmailService: Usando API HTTP do Brevo para enviar email
✅ EmailService (Brevo API): Email enviado com sucesso
```

**❌ Ainda com problema:**
```
📧 EmailService: Usando SMTP tradicional (BREVO_API_KEY não configurado)
❌ EmailService: Erro: Connection timeout
```

---

## 📋 Variáveis que Devem Estar no Render

**Obrigatório:**
```
BREVO_API_KEY=xkeysib-sua-api-key-aqui
SMTP_FROM=seu-email@brevo.com
```

**Opcional (pode remover se quiser):**
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=seu-email@brevo.com
SMTP_PASS=sua-senha-smtp
```

---

## 🆘 Se Ainda Não Funcionar

1. **Verifique se `BREVO_API_KEY` está salva** no Render
2. **Verifique se o deploy finalizou** (aguarde 2-3 minutos)
3. **Verifique os logs** para ver qual método está sendo usado
4. **Tente reiniciar o serviço** manualmente no Render

---

## ✨ Pronto!

Após configurar `BREVO_API_KEY` no Render, os emails devem funcionar sem timeout!

**O código já está pronto** - só falta configurar a variável no Render.

---

**Última atualização:** 2024-01-XX

