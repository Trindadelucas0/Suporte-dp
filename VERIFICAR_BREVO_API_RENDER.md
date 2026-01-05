# 🔍 Como Verificar se Brevo API Está Funcionando no Render

## 📋 Checklist

### **1. Verificar Logs do Render**

Nos logs do Render, procure por estas mensagens quando o servidor inicia:

**✅ Funcionando (API HTTP):**
```
🔍 EmailService: Verificando configuração de email...
   - Brevo API instalado: ✅ SIM
   - BREVO_API_KEY configurado: ✅ SIM
✅ EmailService: Usando API HTTP do Brevo (recomendado para Render)
   - API Key: xsmtpsib-b0a...
   - Brevo Client inicializado: true
```

**❌ Problema 1: Pacote não instalado**
```
   - Brevo API instalado: ❌ NÃO
⚠️ EmailService: Pacote "@getbrevo/brevo" não instalado.
```

**Solução:** Aguarde o deploy finalizar (o Render instala automaticamente)

---

**❌ Problema 2: API Key não configurada**
```
   - BREVO_API_KEY configurado: ❌ NÃO
⚠️ EmailService: BREVO_API_KEY não configurado.
```

**Solução:** Configure `BREVO_API_KEY` no Render

---

**❌ Problema 3: Erro na inicialização**
```
❌ EmailService: Erro ao inicializar Brevo API: [mensagem de erro]
```

**Solução:** Verifique a mensagem de erro específica

---

### **2. Verificar Variáveis no Render**

No Render, verifique se estas variáveis estão configuradas:

1. **BREVO_API_KEY**
   - Valor: `xsmtpsib-b0a992ef6d6e0916f8c557e9bb689ccb26eb07b7bb2124bd3f53488b6908c25f-iwllVP06b47AgrAc`
   - Status: ✅ Deve estar configurado

2. **SMTP_FROM**
   - Valor: `ads.mktt@gmail.com`
   - Status: ✅ Deve estar configurado

---

### **3. Verificar se Deploy Finalizou**

1. No Render, vá em **"Events"** ou **"Logs"**
2. Procure por: `npm install` ou `Installing dependencies`
3. Aguarde até aparecer: `Build successful` ou `Deploy successful`

**⏱️ Tempo:** Geralmente 2-3 minutos

---

### **4. Testar Envio de Email**

Após o deploy, faça um teste:

1. **Faça um cadastro de teste** no sistema
2. **Verifique os logs:**
   - Deve aparecer: `📧 EmailService: Usando API HTTP do Brevo para enviar notificação`
   - Deve aparecer: `✅ EmailService (Brevo API): Notificação de novo usuário enviada`
3. **Verifique sua caixa de entrada** (`lucasrodrigues4@live.com`)

---

## 🆘 Se Ainda Não Funcionar

### **Cenário 1: Logs mostram "Brevo API instalado: ❌ NÃO"**

**Causa:** O pacote não foi instalado ainda

**Solução:**
1. Verifique se o `package.json` tem `"@getbrevo/brevo": "^1.0.0"`
2. Force um novo deploy no Render (vá em "Manual Deploy" > "Deploy latest commit")
3. Aguarde o deploy finalizar

---

### **Cenário 2: Logs mostram "BREVO_API_KEY não configurado"**

**Causa:** A variável não está salva no Render

**Solução:**
1. Vá em **Environment** no Render
2. Verifique se `BREVO_API_KEY` está listada
3. Se não estiver, adicione novamente
4. Salve e aguarde o deploy

---

### **Cenário 3: Erro na inicialização**

**Causa:** Problema com a API Key ou formato

**Solução:**
1. Verifique se a API Key está completa (não cortada)
2. Verifique se não há espaços extras
3. Tente gerar uma nova API Key no Brevo
4. Atualize no Render

---

## ✅ Após Configurar Corretamente

Você verá nos logs:

```
✅ EmailService: Usando API HTTP do Brevo (recomendado para Render)
📧 EmailService: Usando API HTTP do Brevo para enviar email
✅ EmailService (Brevo API): Email enviado com sucesso
```

E os emails funcionarão sem timeout!

---

**Última atualização:** 2024-01-XX

