# 📍 ONDE CONFIGURAR APP_URL

## ⚠️ IMPORTANTE: APP_URL NÃO É ONDE AS PESSOAS SE CADASTRAM!

O `APP_URL` é uma **configuração técnica interna** do sistema.

**Os usuários NÃO precisam fazer nada relacionado ao APP_URL!**

---

## 🔧 ONDE CONFIGURAR?

### **OPÇÃO 1: No Render (Recomendado - Variáveis de Ambiente)**

1. Acesse: https://dashboard.render.com
2. Clique no seu **Web Service**
3. Vá em **Environment**
4. Clique em **Add Environment Variable**
5. Adicione:
   - **Key:** `APP_URL`
   - **Value:** `https://seu-app.onrender.com`
6. Clique em **Save Changes**

**Pronto!** O Render aplica automaticamente.

---

### **OPÇÃO 2: No Arquivo .env (Desenvolvimento Local)**

Se estiver testando localmente, adicione no arquivo `.env` na raiz do projeto:

```env
APP_URL=http://localhost:3000
```

**Importante:** Em produção, use a Opção 1 (Render).

---

## 📋 PASSO A PASSO NO RENDER

### **1. Acesse o Dashboard do Render:**
```
https://dashboard.render.com
```

### **2. Selecione seu Web Service:**
- Clique no nome do seu serviço

### **3. Vá em Environment:**
- Menu lateral → **Environment**

### **4. Adicione a variável:**
- Clique em **Add Environment Variable**
- **Key:** `APP_URL`
- **Value:** `https://seu-app.onrender.com` (use a URL do seu próprio serviço)

### **5. Salve:**
- Clique em **Save Changes**

### **6. Deploy automático:**
- O Render faz deploy automaticamente quando você salva variáveis

---

## 🎯 EXEMPLO VISUAL

No Render, seria assim:

```
Environment Variables
┌─────────────────────────────────────────────┐
│ Key                    Value                │
├─────────────────────────────────────────────┤
│ APP_URL               https://seu-app...   │
│ DB_HOST               seu-host...          │
│ DB_PASSWORD           *******               │
│ INFINITEPAY_HANDLE    lucas-rodrigues-740  │
│ VALOR_MENSALIDADE     19.90                │
│ ...                    ...                  │
└─────────────────────────────────────────────┘
```

---

## ✅ O QUE ACONTECE DEPOIS?

Após configurar o `APP_URL`:

1. ✅ O sistema usa automaticamente para criar `redirect_url`
2. ✅ O sistema usa automaticamente para criar `webhook_url`
3. ✅ InfinitePay recebe as URLs corretas
4. ✅ Tudo funciona automaticamente

**Os usuários continuam usando o sistema normalmente!**

---

## ❓ PERGUNTAS FREQUENTES

### **P: Os usuários precisam configurar APP_URL?**
R: ❌ **NÃO!** É uma configuração técnica interna. Apenas o desenvolvedor/admin configura.

### **P: Onde os usuários se cadastram?**
R: No próprio sistema, através das páginas normais de cadastro/login. O APP_URL é apenas usado internamente pelo sistema.

### **P: Preciso configurar uma vez só?**
R: ✅ Sim! Uma vez configurado no Render, fica permanente.

### **P: E se mudar a URL do app?**
R: Atualize o `APP_URL` nas variáveis de ambiente do Render e faça deploy.

---

## 📊 RESUMO

| O que | Quem | Onde |
|-------|------|------|
| **Configurar APP_URL** | Desenvolvedor/Admin | Render → Environment Variables |
| **Cadastrar no sistema** | Usuários finais | Páginas normais do app |

**São coisas completamente diferentes!**

---

**Configure no Render e está pronto!** 🚀

