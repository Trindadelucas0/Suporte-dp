# 🔧 COMO CONFIGURAR APP_URL

## 📍 O QUE É O APP_URL?

O `APP_URL` é a **URL pública do seu aplicativo em produção**.

É a URL que os usuários usam para acessar seu sistema.

---

## ✅ O QUE COLOCAR NO APP_URL?

### **Exemplo se estiver no Render:**

```env
APP_URL=https://seu-app.onrender.com
```

**Onde:**
- `seu-app` = nome do seu serviço no Render

### **Exemplo se estiver em outro serviço:**

```env
# Vercel
APP_URL=https://seu-app.vercel.app

# Railway
APP_URL=https://seu-app.railway.app

# Heroku
APP_URL=https://seu-app.herokuapp.com

# Domínio próprio
APP_URL=https://seudominio.com.br
```

---

## ⚠️ IMPORTANTE

### **1. Use HTTPS (não HTTP)**
```env
✅ CORRETO: APP_URL=https://seu-app.onrender.com
❌ ERRADO:   APP_URL=http://seu-app.onrender.com
```

### **2. Não coloque barra no final**
```env
✅ CORRETO: APP_URL=https://seu-app.onrender.com
❌ ERRADO:   APP_URL=https://seu-app.onrender.com/
```

### **3. Use a URL real do seu app**
- Não use `localhost`
- Não use `127.0.0.1`
- Use a URL pública onde o app está hospedado

---

## 🎯 COMO DESCOBRIR A URL DO SEU APP?

### **Se estiver no Render:**

1. Acesse https://dashboard.render.com
2. Clique no seu serviço
3. Veja a URL no topo (ex: `https://seu-app.onrender.com`)

### **Se estiver em outro serviço:**

- Vercel: Dashboard → Seu projeto → Settings → Domains
- Railway: Dashboard → Seu projeto → Settings → Networking
- Heroku: Dashboard → Seu app → Settings → Domains

---

## 📋 EXEMPLO COMPLETO DE .env

```env
# ============================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ============================================
APP_NAME=Suporte DP
APP_URL=https://suporte-dp.onrender.com
```

**Onde `suporte-dp` é o nome do seu serviço no Render.**

---

## 🔄 O QUE O SISTEMA FAZ COM O APP_URL?

O sistema usa automaticamente:

### **1. redirect_url (após pagamento):**
```
https://suporte-dp.onrender.com/cobranca/pagamento-sucesso
```

### **2. webhook_url (notificação de pagamento):**
```
https://suporte-dp.onrender.com/webhook/infinitepay
```

**Tudo é construído automaticamente a partir do `APP_URL`!**

---

## ✅ PASSO A PASSO

1. **Descubra a URL do seu app**
   - Render: Dashboard → Seu serviço → URL no topo

2. **Adicione no .env:**
   ```env
   APP_URL=https://sua-url-real.com
   ```

3. **Deploy novamente** (se já estiver em produção)

4. **Pronto!** O sistema vai usar essa URL automaticamente

---

## 🧪 TESTE EM LOCALHOST (Desenvolvimento)

Se estiver testando localmente, use:

```env
APP_URL=http://localhost:3000
```

**Mas em produção, SEMPRE use HTTPS!**

---

## ❓ PERGUNTAS FREQUENTES

### **P: Posso usar localhost em produção?**
R: ❌ Não! Use sempre a URL pública do serviço.

### **P: Preciso adicionar `/` no final?**
R: ❌ Não! Não coloque barra no final.

### **P: Posso usar HTTP em produção?**
R: ⚠️ Não recomendado. Use sempre HTTPS.

### **P: E se mudar de servidor?**
R: Atualize o `APP_URL` no `.env` e faça deploy novamente.

---

**Configure com a URL real do seu app e está pronto!** 🚀

