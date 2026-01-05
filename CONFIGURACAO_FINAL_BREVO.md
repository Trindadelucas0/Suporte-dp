# ✅ Configuração Final: Brevo API no Render

## 🔴 Problema Atual

O sistema está usando **SMTP** e dando timeout porque `BREVO_API_KEY` **não está configurado** no Render.

**Log mostra:**
```
⚠️ Erro ao verificar conexão SMTP: Connection timeout
```

---

## ✅ Solução: Configurar BREVO_API_KEY no Render

### **Passo 1: Acessar Render**

1. Acesse: **https://dashboard.render.com/**
2. Selecione seu serviço (Web Service)
3. Vá em **"Environment"**

---

### **Passo 2: Adicionar Variáveis**

#### **Variável 1: BREVO_API_KEY**

**Nome:**
```
BREVO_API_KEY
```

**Valor:**
```
xsmtpsib-b0a992ef6d6e0916f8c557e9bb689ccb26eb07b7bb2124bd3f53488b6908c25f-iwllVP06b47AgrAc
```

---

#### **Variável 2: SMTP_FROM**

**Nome:**
```
SMTP_FROM
```

**Valor:**
```
ads.mktt@gmail.com
```

---

### **Passo 3: Salvar e Aguardar**

1. **Clique em "Save Changes"**
2. **O Render reinicia automaticamente**
3. **Aguarde 2-3 minutos** para o deploy finalizar
4. **O Render vai instalar** o pacote `@getbrevo/brevo` automaticamente

---

## ✅ Como Verificar se Funcionou

### **Nos Logs do Render, você verá:**

**✅ Funcionando (API HTTP):**
```
✅ EmailService: Usando API HTTP do Brevo (recomendado para Render)
📧 EmailService: Usando API HTTP do Brevo para enviar email
✅ EmailService (Brevo API): Email enviado com sucesso
```

**❌ Ainda com problema (SMTP):**
```
📧 EmailService: Usando SMTP tradicional (BREVO_API_KEY não configurado)
⚠️ Erro ao verificar conexão SMTP: Connection timeout
```

---

## 📋 Variáveis que Devem Estar no Render

**Obrigatório:**
```
BREVO_API_KEY=xsmtpsib-b0a992ef6d6e0916f8c557e9bb689ccb26eb07b7bb2124bd3f53488b6908c25f-iwllVP06b47AgrAc
SMTP_FROM=ads.mktt@gmail.com
```

**Opcional (pode remover se quiser):**
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=ads.mktt@gmail.com
SMTP_PASS=sua-senha-smtp
```

---

## 🚀 Após Configurar

1. **Aguarde o deploy finalizar** (2-3 minutos)
2. **Verifique os logs** - deve aparecer "Usando API HTTP do Brevo"
3. **Teste:** Faça um cadastro de teste
4. **Verifique sua caixa de entrada** - deve receber email de teste

---

## ⚠️ Importante

- ✅ O código **já está pronto** para usar Brevo API
- ✅ O pacote `@getbrevo/brevo` **já está no package.json**
- ⚠️ **Falta apenas configurar** `BREVO_API_KEY` no Render

---

## ✨ Pronto!

Após configurar `BREVO_API_KEY` no Render, os emails devem funcionar sem timeout!

---

**Última atualização:** 2024-01-XX

