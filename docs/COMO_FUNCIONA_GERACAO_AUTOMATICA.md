# 🔄 COMO FUNCIONA A GERAÇÃO AUTOMÁTICA DE COBRANÇAS

## ✅ SIM, O SISTEMA GERA COBRANÇAS AUTOMATICAMENTE

O sistema está configurado para gerar cobranças de **R$ 19,90** automaticamente para todos os usuários ativos.

---

## 📅 QUANDO AS COBRANÇAS SÃO GERADAS

### Agendamento Automático

**Cronograma:** Dia 1 de cada mês às 00:00 (horário de Brasília)

**Configuração:**
```javascript
// jobs/scheduler.js
cron.schedule('0 0 1 * *', async () => {
  await cobrancaService.gerarCobrancasMensais();
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});
```

---

## 🔍 COMO FUNCIONA

### 1. Busca Usuários Ativos

O sistema busca todos os usuários que:
- ✅ Estão ativos (`ativo = TRUE`)
- ✅ Não estão bloqueados por pagamento (`bloqueado_pagamento = FALSE`)

### 2. Gera Cobrança para Cada Usuário

Para cada usuário encontrado:
- ✅ Cria cobrança de **R$ 19,90** (valor configurado em `VALOR_MENSALIDADE`)
- ✅ Data de vencimento: **Dia 10 do próximo mês**
- ✅ Mês de referência: **YYYY-MM** (ex: `2025-02`)
- ✅ Status inicial: **pendente**

### 3. Cria Link de Pagamento

- ✅ Gera link único no InfinitePay para cada cobrança
- ✅ Salva `external_id` e `link_pagamento` no banco
- ✅ Envia dados do cliente para o InfinitePay

### 4. Proteção Contra Duplicatas

- ✅ Verifica se já existe cobrança para o mesmo mês
- ✅ Se já existe, **não cria nova cobrança**
- ✅ Retorna a cobrança existente

---

## 💰 VALOR DA COBRANÇA

O valor é configurado na variável de ambiente:

```env
VALOR_MENSALIDADE=19.90
```

**Código:**
```javascript
// services/cobrancaService.js
const valor = parseFloat(process.env.VALOR_MENSALIDADE || 19.90);
```

---

## 📋 EXEMPLO DE FLUXO

### Dia 1 de Janeiro (00:00)

1. Scheduler executa `gerarCobrancasMensais()`
2. Busca todos os usuários ativos
3. Para cada usuário:
   - Verifica se já tem cobrança para `2025-02`
   - Se não tiver, cria nova cobrança:
     - Valor: R$ 19,90
     - Vencimento: 10/02/2025
     - Status: pendente
     - Link de pagamento: gerado no InfinitePay

### Dia 10 de Fevereiro

- Cobrança vence
- Sistema envia lembretes (se configurado)

### Dia 17 de Fevereiro (se não pagou)

- Após 7 dias de atraso (configurável)
- Usuário é bloqueado automaticamente

---

## 🧪 COMO TESTAR MANUALMENTE

### Opção 1: Via Admin (se houver endpoint)

Acesse o painel admin e use a função de gerar cobranças manualmente.

### Opção 2: Via Terminal/Console

```javascript
const cobrancaService = require('./services/cobrancaService');
await cobrancaService.gerarCobrancasMensais();
```

### Opção 3: Executar Job do Scheduler

```javascript
const scheduler = require('./jobs/scheduler');
await scheduler.runJob('cobrancas');
```

---

## ⚙️ CONFIGURAÇÕES

### Variáveis de Ambiente Necessárias

```env
# Valor da mensalidade
VALOR_MENSALIDADE=19.90

# Dias para bloquear após vencimento
DIAS_PARA_BLOQUEIO=7

# InfinitePay
INFINITEPAY_HANDLE=lucas-rodrigues-740
APP_URL=https://seu-app.onrender.com
```

---

## ✅ VERIFICAÇÕES

### O sistema NÃO gera cobrança se:

- ❌ Usuário está bloqueado por pagamento
- ❌ Usuário está inativo
- ❌ Já existe cobrança para o mesmo mês
- ❌ Usuário é admin

### O sistema GERA cobrança se:

- ✅ Usuário está ativo
- ✅ Usuário não está bloqueado
- ✅ Não existe cobrança para o mês atual
- ✅ Usuário não é admin

---

## 📊 LOGS

Quando o scheduler executa, você verá nos logs:

```
🔄 Iniciando geração de cobranças mensais...
✅ Cobrança criada para usuário {id} - Mês: 2025-02
✅ Cobrança criada para usuário {id} - Mês: 2025-02
✅ 5 cobranças geradas
```

---

## 🔧 AJUSTAR VALOR

Para mudar o valor da mensalidade:

1. Edite o `.env`:
   ```env
   VALOR_MENSALIDADE=29.90
   ```

2. Reinicie o servidor

3. Próxima geração automática usará o novo valor

---

## 📝 RESUMO

✅ **SIM**, o sistema gera cobranças automaticamente  
✅ **Valor:** R$ 19,90 (configurável via `VALOR_MENSALIDADE`)  
✅ **Quando:** Dia 1 de cada mês às 00:00  
✅ **Para quem:** Todos os usuários ativos e não bloqueados  
✅ **Proteção:** Não cria duplicatas no mesmo mês

