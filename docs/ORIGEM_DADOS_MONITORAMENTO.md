# 📊 ORIGEM DOS DADOS - MONITORAMENTO

## 🗄️ TABELAS DO BANCO DE DADOS

O sistema de monitoramento puxa dados de **2 tabelas principais**:

### 1. Tabela: `users`
**Campos usados:**
- `id` - ID do usuário
- `nome` - Nome do cliente
- `email` - Email do cliente
- `is_admin` - Se é administrador (filtra apenas clientes)
- `bloqueado_pagamento` - Se está bloqueado por pagamento

**Localização:** Tabela já existente no sistema

---

### 2. Tabela: `cobrancas`
**Campos usados:**
- `id` - ID da cobrança
- `user_id` - ID do usuário (FK para users)
- `valor` - Valor da cobrança
- `status` - Status: 'pendente', 'paga', 'vencida', 'cancelada'
- `data_vencimento` - Data de vencimento
- `data_pagamento` - Data do pagamento (quando foi pago)
- `mes_referencia` - Mês de referência (formato: YYYY-MM)
- `external_id` - ID externo (InfinitePay)

**Localização:** Criada na migração `007_create_cobranca.sql`

---

## 📋 QUERIES SQL UTILIZADAS

### 1. Estatísticas Gerais

#### Total de Clientes:
```sql
SELECT COUNT(*) as total 
FROM users 
WHERE is_admin = false
```
**De onde vem:** Tabela `users`  
**Filtro:** Apenas clientes (não admin)

---

#### Clientes em Dia:
```sql
SELECT COUNT(DISTINCT u.id) as total
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND c.status = 'paga'
AND c.data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
```
**De onde vem:** 
- Tabela `users` (join)
- Tabela `cobrancas` (join)

**Filtro:**
- Não é admin
- Status = 'paga'
- Pagamento nos últimos 30 dias

---

#### Clientes Pendentes:
```sql
SELECT COUNT(DISTINCT u.id) as total
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND c.status IN ('pendente', 'vencida')
AND c.data_vencimento >= CURRENT_DATE - INTERVAL '30 days'
```
**De onde vem:**
- Tabela `users` (join)
- Tabela `cobrancas` (join)

**Filtro:**
- Não é admin
- Status pendente ou vencida
- Vencimento nos últimos 30 dias

---

#### Clientes Bloqueados:
```sql
SELECT COUNT(*) as total
FROM users
WHERE is_admin = false
AND bloqueado_pagamento = true
```
**De onde vem:** Tabela `users`  
**Filtro:**
- Não é admin
- Campo `bloqueado_pagamento = true`

---

#### Clientes Prestes a Bloquear:
```sql
SELECT COUNT(DISTINCT u.id) as total
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND u.bloqueado_pagamento = false
AND c.status = 'vencida'
AND c.data_vencimento >= CURRENT_DATE - INTERVAL '7 days'
AND c.data_vencimento < CURRENT_DATE
```
**De onde vem:**
- Tabela `users` (join)
- Tabela `cobrancas` (join)

**Filtro:**
- Não é admin
- Não está bloqueado ainda
- Status vencida
- Vencimento nos últimos 7 dias (configurável via `DIAS_PARA_BLOQUEIO`)

---

#### Cobranças Pendentes (Valor):
```sql
SELECT COUNT(*) as total, COALESCE(SUM(valor), 0) as valor_total
FROM cobrancas
WHERE status IN ('pendente', 'vencida')
```
**De onde vem:** Tabela `cobrancas`  
**Filtro:** Status pendente ou vencida

---

#### Cobranças Pagas (Valor - Últimos 30 dias):
```sql
SELECT COUNT(*) as total, COALESCE(SUM(valor), 0) as valor_total
FROM cobrancas
WHERE status = 'paga'
AND data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
```
**De onde vem:** Tabela `cobrancas`  
**Filtro:**
- Status = 'paga'
- Pagamento nos últimos 30 dias

---

### 2. Lista de Clientes Prestes a Bloquear

```sql
SELECT 
  u.id,
  u.nome,
  u.email,
  c.id as cobranca_id,
  c.valor,
  c.data_vencimento,
  c.status,
  c.mes_referencia,
  CURRENT_DATE - c.data_vencimento as dias_atraso,
  7 - (CURRENT_DATE - c.data_vencimento) as dias_para_bloquear
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND u.bloqueado_pagamento = false
AND c.status = 'vencida'
AND c.data_vencimento >= CURRENT_DATE - INTERVAL '7 days'
AND c.data_vencimento < CURRENT_DATE
ORDER BY c.data_vencimento ASC
LIMIT 50
```

**De onde vem:**
- `users` → nome, email
- `cobrancas` → valor, data_vencimento, status, mes_referencia

**Campos calculados:**
- `dias_atraso` = Hoje - data_vencimento
- `dias_para_bloquear` = DIAS_PARA_BLOQUEIO - dias_atraso

---

### 3. Lista de Clientes Pendentes

```sql
SELECT 
  u.id,
  u.nome,
  u.email,
  c.id as cobranca_id,
  c.valor,
  c.data_vencimento,
  c.status,
  c.mes_referencia,
  CURRENT_DATE - c.data_vencimento as dias_atraso
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND c.status IN ('pendente', 'vencida')
AND c.data_vencimento >= CURRENT_DATE - INTERVAL '60 days'
ORDER BY c.data_vencimento ASC
LIMIT 50
```

**De onde vem:**
- `users` → nome, email
- `cobrancas` → valor, data_vencimento, status, mes_referencia

---

### 4. Lista de Clientes Bloqueados

```sql
SELECT 
  u.id,
  u.nome,
  u.email,
  c.id as cobranca_id,
  c.valor,
  c.data_vencimento,
  c.status,
  c.mes_referencia,
  CURRENT_DATE - c.data_vencimento as dias_atraso
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND u.bloqueado_pagamento = true
AND c.status IN ('pendente', 'vencida')
ORDER BY c.data_vencimento ASC
LIMIT 50
```

**De onde vem:**
- `users` → nome, email, bloqueado_pagamento
- `cobrancas` → valor, data_vencimento, status, mes_referencia

---

### 5. Lista de Clientes em Dia

```sql
SELECT DISTINCT
  u.id,
  u.nome,
  u.email,
  (SELECT MAX(data_pagamento) FROM cobrancas WHERE user_id = u.id AND status = 'paga') as ultimo_pagamento,
  (SELECT mes_referencia FROM cobrancas WHERE user_id = u.id AND status = 'paga' ORDER BY data_pagamento DESC LIMIT 1) as ultimo_mes_pago
FROM users u
INNER JOIN cobrancas c ON c.user_id = u.id
WHERE u.is_admin = false
AND c.status = 'paga'
AND c.data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY u.nome ASC
LIMIT 50
```

**De onde vem:**
- `users` → nome, email
- `cobrancas` → data_pagamento, mes_referencia (subquery)

**Campos calculados (subquery):**
- `ultimo_pagamento` = Última data de pagamento do usuário
- `ultimo_mes_pago` = Último mês pago do usuário

---

## 🔗 RELACIONAMENTOS

### JOIN entre tabelas:

```
users (1) ←→ (N) cobrancas
```

- Um usuário pode ter múltiplas cobranças
- Cada cobrança pertence a um usuário
- Join feito por: `users.id = cobrancas.user_id`

---

## 📊 FLUXO DE DADOS

```
┌─────────┐
│  users  │ ← Dados do cliente (nome, email, bloqueado_pagamento)
└────┬────┘
     │
     │ JOIN (user_id)
     │
┌────▼────────┐
│  cobrancas  │ ← Dados da cobrança (valor, status, datas, etc)
└─────────────┘
     │
     │
┌────▼─────────────────┐
│ MonitoramentoController │ ← Processa e agrupa os dados
└────┬─────────────────┘
     │
     │
┌────▼──────────┐
│ View (EJS)    │ ← Exibe na interface
└───────────────┘
```

---

## ⚙️ CONFIGURAÇÕES QUE AFETAM OS DADOS

### Variável de Ambiente:

```env
DIAS_PARA_BLOQUEIO=7  # Usado para calcular "prestes a bloquear"
```

**Onde é usado:**
- Query de "Clientes Prestes a Bloquear"
- Cálculo de `dias_para_bloquear`

---

## 🔄 COMO OS DADOS SÃO ATUALIZADOS

### Atualização Automática:
1. **Scheduler (jobs agendados):**
   - Gera novas cobranças (dia 1 de cada mês)
   - Marca cobranças como vencidas (diariamente)
   - Bloqueia usuários (diariamente)

2. **Webhook do InfinitePay:**
   - Quando pagamento é confirmado
   - Atualiza status da cobrança para 'paga'
   - Atualiza `data_pagamento`
   - Desbloqueia usuário (`bloqueado_pagamento = false`)

3. **Interface:**
   - Página atualiza dados a cada 30 segundos (JavaScript)
   - Recarrega estatísticas via API

---

## 📝 RESUMO

**Tabelas utilizadas:**
- ✅ `users` - Dados dos clientes
- ✅ `cobrancas` - Dados das cobranças

**Campos principais:**
- `users.nome`, `users.email`, `users.bloqueado_pagamento`
- `cobrancas.valor`, `cobrancas.status`, `cobrancas.data_vencimento`, `cobrancas.data_pagamento`

**Relacionamento:**
- JOIN: `users.id = cobrancas.user_id`

**Filtros comuns:**
- `is_admin = false` (apenas clientes)
- `status IN ('pendente', 'vencida', 'paga')`
- Períodos: últimos 30/60 dias
- `bloqueado_pagamento = true/false`

---

**Todas as queries estão no arquivo: `controllers/monitoramentoController.js`** 📄

