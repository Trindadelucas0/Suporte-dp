# 📊 MONITORAMENTO DE COBRANÇAS

## 🎯 FUNCIONALIDADES

Sistema completo de monitoramento para administradores visualizarem:

- ✅ **Clientes que pagaram** (em dia)
- ✅ **Clientes que não pagaram** (pendentes)
- ✅ **Clientes bloqueados**
- ✅ **Clientes prestes a bloquear** (vencidos há menos de X dias)
- ✅ **Estatísticas gerais** (valores, quantidades, totais)
- ✅ **Filtros por status**

---

## 📍 ONDE ACESSAR

### Como Admin:

1. **Painel Admin** → `/admin`
2. Clique no card **"Monitoramento"** (verde)
3. Ou acesse diretamente: `/admin/monitoramento`

---

## 📊 O QUE VOCÊ VÊ

### 1. Estatísticas Gerais (Topo da Página)

**Cards com números:**
- 📊 **Total de Clientes** - Quantidade total
- ✅ **Clientes em Dia** - Pagaram nos últimos 30 dias
- ⏰ **Pendentes** - Com cobrança pendente
- 🔒 **Bloqueados** - Acesso bloqueado

**Valores:**
- 💰 **Pagas (Últimos 30 dias)** - Valor total recebido
- ⚠️ **Pendentes** - Valor total pendente

### 2. Abas de Clientes

**4 abas principais:**

#### 🔴 Prestes a Bloquear
- Clientes com cobrança vencida
- Ainda não foram bloqueados
- Mostra **quantos dias faltam** para bloquear
- Ordenado por data de vencimento

**Informações exibidas:**
- Nome e email
- Valor da cobrança
- Data de vencimento
- Dias de atraso
- Dias para bloquear (contador regressivo)
- Link para ver cobrança

#### ⏰ Pendentes
- Clientes com cobrança pendente ou vencida
- Ordenado por data de vencimento

**Informações exibidas:**
- Nome e email
- Valor da cobrança
- Data de vencimento
- Status (Pendente/Vencida)
- Link para ver cobrança

#### 🔒 Bloqueados
- Clientes com acesso bloqueado
- Ordenado por data de vencimento

**Informações exibidas:**
- Nome e email
- Valor da cobrança
- Data de vencimento
- Dias de atraso
- Link para ver cobrança

#### ✅ Em Dia
- Clientes que pagaram nos últimos 30 dias
- Ordenado por nome

**Informações exibidas:**
- Nome e email
- Último pagamento
- Último mês pago

---

## 🔍 FILTROS E BUSCA

### API Endpoints (para uso futuro):

```javascript
// Estatísticas
GET /admin/api/monitoramento/estatisticas

// Clientes por status
GET /admin/api/monitoramento/clientes?status=pendente
GET /admin/api/monitoramento/clientes?status=paga
GET /admin/api/monitoramento/clientes?status=vencida
GET /admin/api/monitoramento/clientes?status=bloqueado
GET /admin/api/monitoramento/clientes?status=prestes_bloquear
GET /admin/api/monitoramento/clientes?status=em_dia
```

---

## ⚙️ CONFIGURAÇÃO

### Variáveis de Ambiente:

```env
# Dias para bloquear após vencimento
DIAS_PARA_BLOQUEIO=7  # Padrão: 7 dias
```

---

## 📋 DADOS EXIBIDOS

### Prestes a Bloquear:
- Filtro: `status = 'vencida'` E `bloqueado_pagamento = false`
- Período: Últimos X dias (configurável)
- Ordenação: Data de vencimento (mais antigo primeiro)
- Limite: 50 clientes

### Pendentes:
- Filtro: `status IN ('pendente', 'vencida')`
- Período: Últimos 60 dias
- Ordenação: Data de vencimento (mais próximo primeiro)
- Limite: 50 clientes

### Bloqueados:
- Filtro: `bloqueado_pagamento = true` E `status IN ('pendente', 'vencida')`
- Ordenação: Data de vencimento (mais antigo primeiro)
- Limite: 50 clientes

### Em Dia:
- Filtro: `status = 'paga'` E `data_pagamento >= últimos 30 dias`
- Ordenação: Nome (alfabética)
- Limite: 50 clientes

---

## 🔄 ATUALIZAÇÃO AUTOMÁTICA

A página atualiza estatísticas automaticamente a cada **30 segundos** (via JavaScript).

---

## 🎨 DESIGN

- ✅ Interface moderna e responsiva
- ✅ Cores por status (verde, amarelo, vermelho)
- ✅ Tabelas organizadas
- ✅ Abas para navegação fácil
- ✅ Cards de estatísticas destacados

---

## 📱 RESPONSIVO

Funciona perfeitamente em:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile

---

## 🚀 PRONTO PARA USAR!

Acesse `/admin/monitoramento` e comece a monitorar seus clientes! 🎉

