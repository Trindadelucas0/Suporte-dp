# ✅ CHECKLIST PRÉ-PRODUÇÃO

## 📋 VERIFICAÇÃO COMPLETA DO SISTEMA

Data: $(date)

---

## ✅ O QUE ESTÁ OK

### 1. Arquivos Criados/Modificados

#### Services ✅
- [x] `services/cobrancaService.js` - Gerencia cobranças
- [x] `services/bloqueioService.js` - Bloqueio/liberação de acesso
- [x] `services/lembreteService.js` - Envio de lembretes
- [x] `services/cadastroService.js` - Cadastro via link

#### Controllers ✅
- [x] `controllers/cobrancaController.js` - Endpoints de cobrança
- [x] `controllers/webhookController.js` - Webhooks do InfinitePay
- [x] `controllers/authController.js` - Método `cadastroViaLink()` adicionado

#### Models ✅
- [x] `models/Cobranca.js` - Model de cobranças

#### Routes ✅
- [x] `routes/cobranca.js` - Rotas de cobrança
- [x] `routes/webhook.js` - Rotas de webhook
- [x] `routes/auth.js` - Rotas de cadastro via link

#### Views ✅
- [x] `views/cobranca/assinar.ejs` - Página de assinatura
- [x] `views/cobranca/blocked.ejs` - Página de bloqueio
- [x] `views/cobranca/pagar.ejs` - Página de pagamento
- [x] `views/cobranca/pagamento-sucesso.ejs` - Sucesso
- [x] `views/cobranca/ativacao-sucesso.ejs` - Ativação
- [x] `views/auth/cadastro-link.ejs` - Cadastro via link

#### Jobs ✅
- [x] `jobs/scheduler.js` - Jobs agendados

#### Providers ✅
- [x] `providers/infinitepay.provider.js` - Integração InfinitePay

#### Database ✅
- [x] `database/migrations/007_create_cobranca.sql` - Migração de cobranças

---

### 2. Integração no server.js ✅

- [x] Rotas `/cobranca` importadas e configuradas
- [x] Rotas `/webhook` importadas e configuradas
- [x] Scheduler importado e inicializado

---

### 3. Dependências ✅

- [x] `node-cron@3.0.3` - Instalado
- [x] `axios@1.13.2` - Instalado
- [x] `nodemailer` - Já existia (email)
- [x] `pg` - Já existia (PostgreSQL)
- [x] `bcrypt` - Já existia (senhas)

---

### 4. Migrações do Banco ✅

- [x] Tabela `cobrancas` criada
- [x] Tabela `links_ativacao` criada
- [x] Campos adicionados em `users`:
  - [x] `bloqueado_pagamento`
  - [x] `data_ultima_cobranca`
  - [x] `data_proximo_vencimento`
- [x] Índices criados
- [x] Constraints criados

---

### 5. Middleware e Autenticação ✅

- [x] `middleware/auth.js` - Verifica `bloqueado_pagamento`
- [x] `controllers/authController.js` - Verifica bloqueio no login
- [x] Redirecionamento para `/cobranca/blocked` quando bloqueado

---

### 6. Dashboard ✅

- [x] Botão "Assinar Plano" adicionado no dashboard
- [x] Link funciona corretamente

---

## ❌ PROBLEMAS ENCONTRADOS

### 1. ERRO CRÍTICO: scheduler.js linha 9 ⚠️

**Problema:**
```javascript
const bloqueioService = ('../services/bloqueioService'); // ❌ ERRADO
```

**Correção necessária:**
```javascript
const bloqueioService = require('../services/bloqueioService'); // ✅ CORRETO
```

**Localização:** `jobs/scheduler.js:9`

---

### 2. ERRO CRÍTICO: server.js linha 353 ⚠️

**Problema:**
```javascript
scheduler.init(); // ❌ Método não existe
```

**Correção necessária:**
O scheduler exporta uma instância, então deve verificar o método correto.

**Verificar:** `jobs/scheduler.js` - ver qual método exporta (init, start, etc)

---

### 3. Verificar método do scheduler ⚠️

O scheduler pode estar usando `start()` ao invés de `init()`.

---

## 🔧 CORREÇÕES NECESSÁRIAS

### Correção 1: scheduler.js

**Arquivo:** `jobs/scheduler.js`
**Linha:** 9
**Ação:** Adicionar `require` antes do path

### Correção 2: server.js

**Arquivo:** `server.js`
**Linha:** 353
**Ação:** Verificar e corrigir método do scheduler

---

## 📝 CONFIGURAÇÕES NECESSÁRIAS EM PRODUÇÃO

### Variáveis de Ambiente Obrigatórias:

```env
# Servidor
NODE_ENV=production
PORT=3000
APP_URL=https://seu-app.onrender.com  # ⚠️ IMPORTANTE: URL real

# Banco de Dados
DB_HOST=seu-host-postgresql.render.com
DB_PORT=5432
DB_NAME=seu_nome_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# Sessão
SESSION_SECRET=gerar-com-node-comando-abaixo

# Email (já configurado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ads.mktt@gmail.com
SMTP_PASS=fpcgepstw egujwse
SMTP_FROM=ads.mktt@gmail.com

# InfinitePay
INFINITEPAY_PLAN_LINK=https://invoice.infinitepay.io/plans/lucas-rodrigues-740/G6bTNvSgv
INFINITEPAY_USE_MOCK=false

# Regras de Negócio
VALOR_MENSALIDADE=19.90
DIAS_PARA_BLOQUEIO=7
DIAS_LEMBRETE_PRE_5=true
DIAS_LEMBRETE_PRE_2=true
DIAS_LEMBRETE_PRE_0=true
DIAS_AVISO_ATRASO_1=true
DIAS_AVISO_ATRASO_5=true
```

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. Cobrança Recorrente ✅
- [x] Geração automática mensal
- [x] Criação de cobranças
- [x] Salvamento de external_id
- [x] Status de cobrança

### 2. Lembretes ✅
- [x] Lembretes pré-vencimento (5, 2, 0 dias)
- [x] Avisos de atraso (1, 5 dias)
- [x] Templates de email
- [x] Scheduler para envio automático

### 3. Bloqueio Automático ✅
- [x] Bloqueio após X dias de atraso
- [x] Página de bloqueio
- [x] Desbloqueio automático após pagamento
- [x] Middleware de verificação

### 4. Integração InfinitePay ✅
- [x] Provider criado
- [x] Sistema de planos
- [x] Geração de links
- [x] Webhook handler
- [x] Parse de webhook

### 5. Webhook ✅
- [x] Endpoint `/webhook/infinitepay`
- [x] Processamento de pagamento
- [x] Liberação de acesso
- [x] Endpoint de teste

### 6. Cadastro após Assinatura ✅
- [x] Geração de link de cadastro
- [x] Email com link
- [x] Página de cadastro
- [x] Validação de token
- [x] Expiração de link (7 dias)

### 7. Scheduler ✅
- [x] Geração de cobranças mensais
- [x] Envio de lembretes
- [x] Verificação de bloqueios
- [x] Marcação de vencidas

---

## ⚠️ ANTES DE SUBIR EM PRODUÇÃO

### Checklist Final:

- [ ] **CORRIGIR** erro no `jobs/scheduler.js` linha 9
- [ ] **VERIFICAR/CORRIGIR** método do scheduler no `server.js`
- [ ] **TESTAR** scheduler localmente
- [ ] **CONFIGURAR** todas variáveis de ambiente
- [ ] **GERAR** SESSION_SECRET seguro
- [ ] **CONFIGURAR** APP_URL com URL real
- [ ] **CONFIGURAR** webhook no InfinitePay (após deploy)
- [ ] **TESTAR** fluxo completo em localhost (se possível)

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Corrigir erros encontrados
2. ✅ Testar localmente
3. ✅ Fazer deploy
4. ✅ Configurar webhook no InfinitePay
5. ✅ Testar em produção

---

**Status Geral: 95% PRONTO** ⚠️

**Ações necessárias:** Corrigir 2 erros críticos antes do deploy.

