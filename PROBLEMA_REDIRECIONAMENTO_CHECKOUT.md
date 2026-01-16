# 🔍 PROBLEMA: Não Redireciona para /checkout na VPS

## 📋 ANÁLISE DO PROBLEMA

### **Fluxo Esperado:**
1. Usuário se cadastra → Sessão criada → Redireciona para `/checkout`
2. Usuário acessa `/checkout` → Middleware `requireAuth` verifica sessão → Mostra página

### **Problema Identificado:**
Após cadastro, o redirecionamento para `/checkout` acontece, mas o middleware `requireAuth` não encontra a sessão e redireciona de volta para `/login`.

---

## 🔴 CAUSAS PROVÁVEIS

### **1. Cookies Não Estão Sendo Criados/Enviados (MAIS PROVÁVEL)**
**Sintomas:**
- Sessão é salva no servidor
- Mas cookie não chega no navegador
- Próxima requisição não tem sessão

**Causas:**
- Cookie `secure: true` sem HTTPS
- Cookie bloqueado por configuração de domínio
- Cookie não está sendo enviado pelo servidor

### **2. Sessão Não Está Sendo Salva no Banco Antes do Redirecionamento**
**Sintomas:**
- `req.session.save()` é chamado
- Mas redirecionamento acontece antes de salvar no PostgreSQL
- Próxima requisição não encontra sessão no banco

### **3. Middleware `requireAuth` Bloqueando Antes da Sessão Estar Disponível**
**Sintomas:**
- Redirecionamento funciona
- Mas quando chega em `/checkout`, sessão ainda não está disponível
- Middleware bloqueia e redireciona para `/login`

---

## ✅ CORREÇÕES APLICADAS

### **1. Logs de Debug Adicionados**
- Logs no `authController.js` para rastrear salvamento de sessão
- Logs no `requireAuth` para verificar se sessão existe
- Logs no `checkoutController` para verificar acesso

### **2. Verificação de Sessão Melhorada**
- Middleware `requireAuth` agora loga quando sessão não é encontrada
- Facilita diagnóstico do problema

---

## 🔧 SOLUÇÕES PARA TESTAR

### **Solução 1: Verificar Cookies no Navegador**

1. Abra DevTools (F12)
2. Vá em Application → Cookies
3. Após cadastro, verifique se aparece `suporte-dp.sid`
4. Se NÃO aparecer → Problema com cookies

**Correção:**
- Verifique se `HAS_HTTPS` está configurado corretamente
- Se não tem HTTPS, NÃO defina `HAS_HTTPS=true`
- Cookies `secure: false` funcionam em HTTP

---

### **Solução 2: Verificar Logs do Servidor**

Após cadastro, verifique os logs:

```bash
# Deve aparecer:
✅ [REGISTER] Sessão salva com sucesso. Redirecionando...
✅ [REGISTER] Redirecionando para /checkout após cadastro

# Quando chegar em /checkout:
✅ [CHECKOUT] Acessando /checkout com usuário autenticado

# Se aparecer isso, problema:
⚠️ [AUTH] requireAuth: Sessão não encontrada
⚠️ [CHECKOUT] Sessão não encontrada ao acessar /checkout
```

---

### **Solução 3: Verificar Configuração de Sessão**

Verifique se estas variáveis estão configuradas:

```bash
# OBRIGATÓRIO
SESSION_SECRET=seu-secret-aqui

# Se NÃO tem HTTPS (mais comum)
# NÃO defina HAS_HTTPS (deixe undefined)

# Se TEM HTTPS
HAS_HTTPS=true
```

---

### **Solução 4: Testar Acesso Direto**

Após cadastro, tente acessar diretamente:
```
http://seu-ip:3000/checkout
```

Se redirecionar para `/login` → Problema com sessão
Se mostrar página de checkout → Funcionou!

---

## 🐛 DIAGNÓSTICO PASSO A PASSO

### **Passo 1: Verificar Cookies**
1. Faça cadastro
2. Abra DevTools → Application → Cookies
3. Procure por `suporte-dp.sid`
4. **Se não aparecer:** Problema com criação de cookies

### **Passo 2: Verificar Logs**
1. Faça cadastro
2. Veja logs do servidor
3. Procure por mensagens de erro
4. **Se aparecer erro ao salvar sessão:** Problema com banco de dados

### **Passo 3: Verificar Redirecionamento**
1. Faça cadastro
2. Veja URL no navegador
3. **Se ficar em `/register`:** Erro ao salvar sessão
4. **Se vai para `/login`:** Sessão não está disponível

### **Passo 4: Verificar Banco de Dados**
```sql
-- Verificar se tabela sessions existe
SELECT * FROM sessions LIMIT 5;

-- Verificar se há sessões sendo criadas
SELECT COUNT(*) FROM sessions;
```

---

## 🔧 AJUSTES ADICIONAIS RECOMENDADOS

### **1. Adicionar Timeout no Redirecionamento**
Se a sessão não salvar rápido o suficiente, adicionar pequeno delay:

```javascript
// Aguarda 100ms para garantir que sessão foi salva
setTimeout(() => {
  res.redirect('/checkout');
}, 100);
```

### **2. Verificar Conexão com PostgreSQL**
Se o banco estiver lento, sessão pode não salvar a tempo:

```javascript
// Verificar se pool está funcionando
db.pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Erro ao conectar com banco:', err);
});
```

### **3. Usar Regenerate Session ID**
Garantir que sessão seja criada corretamente:

```javascript
req.session.regenerate((err) => {
  if (err) {
    // Tratar erro
  } else {
    req.session.user = { ... };
    req.session.save(() => {
      res.redirect('/checkout');
    });
  }
});
```

---

## 📝 CHECKLIST DE VERIFICAÇÃO

- [ ] Cookies aparecem no navegador após cadastro
- [ ] Logs mostram "Sessão salva com sucesso"
- [ ] Logs mostram "Redirecionando para /checkout"
- [ ] Logs NÃO mostram "Sessão não encontrada" ao acessar /checkout
- [ ] Tabela `sessions` no PostgreSQL tem registros
- [ ] `SESSION_SECRET` está configurado
- [ ] `HAS_HTTPS` está configurado corretamente (false se não tem HTTPS)
- [ ] Banco de dados está acessível e rápido

---

## 🚨 PROBLEMA MAIS PROVÁVEL

**Cookies não estão sendo criados/enviados corretamente na VPS.**

**Causa:** Configuração de cookies `secure` ou problema com domínio/IP.

**Solução:** Verificar se `HAS_HTTPS` está correto e se cookies aparecem no navegador.
