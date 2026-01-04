# 📋 PLANO: Sistema de Renovação Mensal

## 🎯 REQUISITOS

1. **Primeiro Pagamento**: Usuário paga e tem 30 dias de acesso
2. **Renovação Mensal**: A cada 30 dias, precisa fazer novo pagamento
3. **Bloqueio por Inadimplência**: Se não pagar, não pode acessar o app
4. **Página Interna de Renovação**: Dentro do sistema, tem área para renovar
5. **Redirecionamento**: Se expirado, login redireciona para renovação
6. **Após Pagamento de Renovação**: Redireciona para login novamente
7. **Diferenciar Primeiro Pagamento vs Renovação**: Webhook precisa identificar

## 🔄 FLUXO COMPLETO

### 1. PRIMEIRO PAGAMENTO (Já existe)
- ✅ Usuário paga em `/adquirir`
- ✅ É redirecionado para `/register`
- ✅ Cadastra e ganha 30 dias

### 2. LOGIN COM ASSINATURA ATIVA (Já existe parcialmente)
- ✅ Login verifica `subscription_expires_at`
- ❌ **FALTA**: Redirecionar para renovação se expirado

### 3. RENOVAÇÃO (NOVO - Precisamos criar)
- ❌ **CRIAR**: Rota `/renovar` (após login, se expirado)
- ❌ **CRIAR**: View `renovar.ejs` (similar a `/adquirir`, mas interna)
- ❌ **CRIAR**: Controller `renovarController.js`
- ❌ **CRIAR**: Link de pagamento interno para renovação
- ✅ Webhook já processa pagamentos (precisa adaptar)

### 4. WEBHOOK - DIFERENCIAR RENOVAÇÃO (Adaptar)
- ✅ Webhook já atualiza assinatura existente
- ✅ Já verifica se usuário existe
- ✅ Já renova automaticamente
- ⚠️ **MELHORAR**: Identificar se é renovação vs primeiro pagamento

### 5. REDIRECIONAMENTO APÓS RENOVAÇÃO
- ❌ **CRIAR**: Após pagamento de renovação, redirecionar para `/login`
- ❌ **CRIAR**: Mensagem de sucesso no login após renovação

## 📝 IMPLEMENTAÇÃO DETALHADA

### ETAPA 1: Modificar Login para Verificar Expiração

**Arquivo**: `controllers/authController.js` - método `login`

**Lógica**:
```javascript
// Após validar email/senha e antes de criar sessão:

// Verifica se assinatura está expirada
const hoje = new Date();
const expiracao = new Date(user.subscription_expires_at);

if (expiracao < hoje || user.subscription_status === 'inadimplente') {
  // Assinatura expirada - redireciona para renovação
  req.session.user = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    is_admin: user.is_admin
  };
  // Salva sessão temporária para acesso à página de renovação
  req.session.save(() => {
    return res.redirect('/renovar');
  });
}
```

### ETAPA 2: Criar Controller de Renovação

**Arquivo**: `controllers/renovarController.js` (NOVO)

**Funcionalidades**:
- GET `/renovar`: Mostra página de renovação (só para usuários logados com assinatura expirada)
- POST `/renovar`: Cria novo pedido de renovação e gera link de pagamento
- Usa mesmo `InfinitePayService.criarLinkCheckout`
- Gera novo `order_nsu` para o pedido de renovação
- Salva `order_nsu` temporariamente no usuário (ou cria nova tabela `renewal_orders`)

### ETAPA 3: Criar View de Renovação

**Arquivo**: `views/renovar.ejs` (NOVO)

**Conteúdo**:
- Mensagem: "Sua assinatura expirou. Renove para continuar usando o sistema."
- Informações: Data de expiração, valor (R$ 19,90)
- Botão: "Renovar Assinatura"
- Similar a `/adquirir`, mas com contexto de renovação

### ETAPA 4: Adaptar Webhook para Renovação

**Arquivo**: `controllers/webhookController.js`

**Lógica Atual** (já funciona):
- Se usuário existe, atualiza assinatura automaticamente
- Isso já funciona para renovação!

**Melhorar**:
- Adicionar log para identificar se é renovação
- Verificar se `order_nsu` é de renovação (comparar com `users.order_nsu`)

### ETAPA 5: Redirecionar Após Renovação

**Arquivo**: `services/infinitepayService.js`

**Modificar**: `redirect_url` para renovação
- Se for renovação, usar: `/login?renovado=true`
- Se for primeiro pagamento, usar: `/register?order_nsu=...`

**Problema**: Como diferenciar?
- **Solução 1**: Passar flag `is_renewal=true` na query string do redirect
- **Solução 2**: Verificar se usuário já existe no webhook antes do redirect
- **Solução 3**: Usar rota diferente para renovação (`/renovar/redirect`)

**Melhor Solução**: 
- Para renovação: `redirect_url: /login?renovado=true&order_nsu=...`
- Webhook processa e atualiza assinatura
- Usuário é redirecionado para login com mensagem de sucesso

### ETAPA 6: Mensagem no Login Após Renovação

**Arquivo**: `controllers/authController.js` - método `login` (GET)

**Lógica**:
```javascript
if (req.query.renovado === 'true') {
  return res.render('auth/login', {
    title: 'Login - Suporte DP',
    success: 'Assinatura renovada com sucesso! Faça login para continuar.',
    error: null
  });
}
```

### ETAPA 7: Proteger Rotas com Middleware

**Arquivo**: `middleware/auth.js` (verificar se existe)

**Criar/Adaptar middleware**:
```javascript
// Verifica se usuário está autenticado E tem assinatura ativa
function requireActiveSubscription(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  // Buscar usuário no banco para verificar assinatura atualizada
  User.findById(req.session.user.id).then(user => {
    const hoje = new Date();
    const expiracao = new Date(user.subscription_expires_at);
    
    if (expiracao < hoje || user.subscription_status === 'inadimplente') {
      return res.redirect('/renovar');
    }
    
    next();
  });
}
```

**Aplicar em rotas**:
- `/dashboard` e todas as rotas internas
- Exceto `/renovar` (que permite acesso com sessão expirada)

## 📊 ESTRUTURA DE DADOS

### Tabela `orders` (já existe)
- Um pedido pode ser de primeiro pagamento OU renovação
- Diferenciar por: se `users.order_nsu` já existe, é renovação

### Tabela `payments` (já existe)
- Cada pagamento tem `order_nsu` e `user_id`
- Para renovação: `user_id` já existe (diferente de primeiro pagamento)

### Tabela `users` (já existe)
- `order_nsu`: ID do primeiro pedido
- `subscription_expires_at`: Data de expiração
- `subscription_status`: ativa/inadimplente

## 🔍 DIFERENCIAÇÃO: Primeiro Pagamento vs Renovação

### No Webhook:
```javascript
// Se user_id já existe e não é null, é RENOVAÇÃO
// Se user_id é null, é PRIMEIRO PAGAMENTO

const existingUser = await User.findByOrderNsu(order_nsu);
if (existingUser) {
  // RENOVAÇÃO - usuário já existe
  console.log('Renovação de assinatura:', existingUser.id);
  // Atualiza assinatura (já faz isso)
} else {
  // PRIMEIRO PAGAMENTO - aguarda cadastro
  console.log('Primeiro pagamento - aguardando cadastro');
}
```

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **1. Modificar Login** (`controllers/authController.js`)
  - [ ] Verificar expiração antes de criar sessão
  - [ ] Redirecionar para `/renovar` se expirado
  - [ ] Mostrar mensagem de sucesso após renovação

- [ ] **2. Criar Controller de Renovação** (`controllers/renovarController.js`)
  - [ ] GET `/renovar`: Verificar sessão e assinatura
  - [ ] POST `/renovar`: Criar pedido e gerar link
  - [ ] Redirecionar para pagamento

- [ ] **3. Criar View de Renovação** (`views/renovar.ejs`)
  - [ ] Layout similar a `/adquirir`
  - [ ] Mensagem de expiração
  - [ ] Botão de renovação

- [ ] **4. Criar Rota de Renovação** (`routes/renovar.js`)
  - [ ] GET `/renovar`
  - [ ] POST `/renovar`
  - [ ] Middleware: requer autenticação (mesmo expirada)

- [ ] **5. Adaptar InfinitePay Service**
  - [ ] Método para criar link de renovação
  - [ ] Redirect URL: `/login?renovado=true`

- [ ] **6. Adaptar Webhook**
  - [ ] Logs para identificar renovação
  - [ ] Manter lógica atual (já funciona)

- [ ] **7. Criar/Adaptar Middleware**
  - [ ] `requireActiveSubscription`
  - [ ] Aplicar em rotas internas
  - [ ] Exceção: `/renovar` não precisa

- [ ] **8. Atualizar Rotas no Server**
  - [ ] Adicionar `/renovar` antes de middleware de autenticação
  - [ ] Aplicar middleware em rotas protegidas

## 🚀 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. **Criar Controller e View de Renovação** (mais simples)
2. **Modificar Login** (verificar expiração)
3. **Criar Rota de Renovação** (conectar tudo)
4. **Adaptar InfinitePay Service** (redirect URL)
5. **Criar/Adaptar Middleware** (proteção de rotas)
6. **Testar Fluxo Completo**

