# 🗄️ SCHEMA DE DADOS - SISTEMA DE TAREFAS

## 📋 ESTRUTURA CONCEITUAL DAS TABELAS

### TABELA: `tarefas`

```sql
CREATE TABLE IF NOT EXISTS tarefas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados Principais
    nome VARCHAR(255) NOT NULL,                    -- NOME LIVRE (obrigatório)
    tipo VARCHAR(50),                             -- OPCIONAL (pode ser NULL)
    descricao TEXT,                               -- OPCIONAL
    
    -- Status e Prioridade (FIXOS)
    status VARCHAR(20) NOT NULL DEFAULT 'nao_iniciado',  -- ENUM: nao_iniciado, em_andamento, feito
    prioridade VARCHAR(10) NOT NULL DEFAULT 'media',     -- ENUM: alta, media, baixa
    
    -- Datas
    data_vencimento DATE NOT NULL,                -- OBRIGATÓRIA (para calendário)
    data_conclusao DATE,                          -- Preenchida quando status = 'feito'
    
    -- Ordenação
    ordem INTEGER DEFAULT 0,                      -- Ordem dentro da coluna do Kanban
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_status CHECK (status IN ('nao_iniciado', 'em_andamento', 'feito')),
    CONSTRAINT check_prioridade CHECK (prioridade IN ('alta', 'media', 'baixa')),
    CONSTRAINT check_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
);

-- Índices para Performance
CREATE INDEX idx_tarefas_user_status ON tarefas(user_id, status, ordem);
CREATE INDEX idx_tarefas_user_data ON tarefas(user_id, data_vencimento);
CREATE INDEX idx_tarefas_user_prioridade ON tarefas(user_id, prioridade, data_vencimento);
CREATE INDEX idx_tarefas_status ON tarefas(status) WHERE status != 'feito'; -- Para notificações

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tarefas_updated_at 
    BEFORE UPDATE ON tarefas
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para preencher data_conclusao automaticamente
CREATE OR REPLACE FUNCTION set_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'feito' AND OLD.status != 'feito' THEN
        NEW.data_conclusao = CURRENT_DATE;
    ELSIF NEW.status != 'feito' AND OLD.status = 'feito' THEN
        NEW.data_conclusao = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_data_conclusao
    BEFORE UPDATE ON tarefas
    FOR EACH ROW
    EXECUTE FUNCTION set_data_conclusao();
```

---

### EXTENSÃO DA TABELA: `notificacoes` (Existente)

**Adicionar campo opcional para relacionar com tarefas:**

```sql
-- Migration para adicionar campo tarefa_id (se não existir)
ALTER TABLE notificacoes 
ADD COLUMN IF NOT EXISTS tarefa_id UUID REFERENCES tarefas(id) ON DELETE SET NULL;

-- Índice para buscar notificações de uma tarefa
CREATE INDEX IF NOT EXISTS idx_notificacoes_tarefa ON notificacoes(tarefa_id) WHERE tarefa_id IS NOT NULL;
```

**Estrutura completa da tabela `notificacoes` (após extensão):**

```sql
-- Campos existentes:
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
tipo VARCHAR(50)                    -- info, warning, success, error
titulo VARCHAR(255)
mensagem TEXT
lida BOOLEAN DEFAULT FALSE
link VARCHAR(255)
created_at TIMESTAMP

-- Novo campo:
tarefa_id UUID REFERENCES tarefas(id) ON DELETE SET NULL  -- OPCIONAL
```

---

## 📊 RELACIONAMENTOS ENTRE TABELAS

```
users (1) ────< (N) tarefas
                │
                │ (1 tarefa pode ter N notificações)
                │
                └───< (N) notificacoes
                
users (1) ────< (N) notificacoes
                │
                └─── (notificações administrativas não têm tarefa_id)
```

---

## 🔍 QUERIES CONCEITUAIS IMPORTANTES

### 1. Buscar Tarefas do Usuário por Status (Kanban)

```sql
SELECT 
    id,
    nome,
    tipo,
    status,
    prioridade,
    data_vencimento,
    ordem,
    created_at
FROM tarefas
WHERE user_id = $1 
  AND status = $2
ORDER BY 
    CASE prioridade 
        WHEN 'alta' THEN 1 
        WHEN 'media' THEN 2 
        WHEN 'baixa' THEN 3 
    END,
    data_vencimento ASC,
    ordem ASC;
```

**Parâmetros:**
- `$1` = user_id
- `$2` = 'nao_iniciado' | 'em_andamento' | 'feito'

---

### 2. Buscar Tarefas para Calendário

```sql
SELECT 
    id,
    nome,
    tipo,
    status,
    prioridade,
    data_vencimento,
    data_conclusao
FROM tarefas
WHERE user_id = $1 
  AND data_vencimento BETWEEN $2 AND $3
ORDER BY data_vencimento ASC, prioridade DESC;
```

**Parâmetros:**
- `$1` = user_id
- `$2` = data_inicio (primeiro dia do mês)
- `$3` = data_fim (último dia do mês)

---

### 3. Buscar Tarefas Vencendo (Para Notificações)

```sql
-- Tarefas que vencem hoje
SELECT 
    id,
    user_id,
    nome,
    data_vencimento
FROM tarefas
WHERE data_vencimento = CURRENT_DATE
  AND status != 'feito'
  AND id NOT IN (
      SELECT tarefa_id 
      FROM notificacoes 
      WHERE tarefa_id IS NOT NULL 
        AND tipo = 'warning'
        AND lida = false
        AND DATE(created_at) = CURRENT_DATE
  );

-- Tarefas atrasadas
SELECT 
    id,
    user_id,
    nome,
    data_vencimento
FROM tarefas
WHERE data_vencimento < CURRENT_DATE
  AND status != 'feito'
  AND id NOT IN (
      SELECT tarefa_id 
      FROM notificacoes 
      WHERE tarefa_id IS NOT NULL 
        AND tipo = 'error'
        AND lida = false
  );

-- Tarefas que vencem amanhã
SELECT 
    id,
    user_id,
    nome,
    data_vencimento
FROM tarefas
WHERE data_vencimento = CURRENT_DATE + INTERVAL '1 day'
  AND status = 'nao_iniciado'
  AND id NOT IN (
      SELECT tarefa_id 
      FROM notificacoes 
      WHERE tarefa_id IS NOT NULL 
        AND tipo = 'info'
        AND lida = false
        AND DATE(created_at) = CURRENT_DATE
  );
```

---

### 4. Atualizar Ordem no Kanban (Drag & Drop)

```sql
-- Quando usuário arrasta card para nova posição
UPDATE tarefas
SET ordem = $1,
    status = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $3 
  AND user_id = $4;
```

**Parâmetros:**
- `$1` = nova_ordem
- `$2` = novo_status ('nao_iniciado' | 'em_andamento' | 'feito')
- `$3` = tarefa_id
- `$4` = user_id

---

### 5. Criar Notificação de Tarefa

```sql
INSERT INTO notificacoes (
    user_id,
    tipo,
    titulo,
    mensagem,
    tarefa_id,
    link,
    lida
) VALUES (
    $1,  -- user_id
    $2,  -- tipo: 'warning' | 'error' | 'info'
    $3,  -- titulo
    $4,  -- mensagem
    $5,  -- tarefa_id
    $6,  -- link: '/tarefas?id=' || tarefa_id
    false
);
```

---

### 6. Buscar Notificações Não Lidas do Usuário

```sql
SELECT 
    n.id,
    n.tipo,
    n.titulo,
    n.mensagem,
    n.link,
    n.tarefa_id,
    t.nome as tarefa_nome,
    n.created_at
FROM notificacoes n
LEFT JOIN tarefas t ON n.tarefa_id = t.id
WHERE n.user_id = $1
  AND n.lida = false
ORDER BY n.created_at DESC
LIMIT 50;
```

---

### 7. Estatísticas de Tarefas (Dashboard)

```sql
-- Resumo de tarefas do usuário
SELECT 
    status,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE prioridade = 'alta') as alta,
    COUNT(*) FILTER (WHERE prioridade = 'media') as media,
    COUNT(*) FILTER (WHERE prioridade = 'baixa') as baixa
FROM tarefas
WHERE user_id = $1
GROUP BY status;

-- Tarefas do dia
SELECT 
    id,
    nome,
    tipo,
    prioridade,
    status
FROM tarefas
WHERE user_id = $1
  AND data_vencimento = CURRENT_DATE
  AND status != 'feito'
ORDER BY 
    CASE prioridade 
        WHEN 'alta' THEN 1 
        WHEN 'media' THEN 2 
        WHEN 'baixa' THEN 3 
    END;
```

---

## 🎨 VALORES PADRÃO E ENUMS

### Status (FIXO)
- `'nao_iniciado'` - Padrão ao criar
- `'em_andamento'` - Quando usuário move para coluna do meio
- `'feito'` - Quando usuário move para coluna final

### Prioridade (FIXA)
- `'alta'` - Cor vermelha, ordenação 1
- `'media'` - Cor amarela, ordenação 2, **PADRÃO**
- `'baixa'` - Cor verde, ordenação 3

### Tipo (OPCIONAL - Sugestões)
- `'FÉRIAS'`
- `'13° ADIANTAMENTO'`
- `'13° INTEGRAL'`
- `'RESCISÃO'`
- `'ADMISSÃO'`
- `'AFASTAMENTO'`
- `'ALTERAÇÃO SALARIAL'`
- `'ALTERAÇÃO DE CARGO'`
- `'OUTROS'`
- `NULL` - Permitido (usuário não precisa selecionar)

---

## 🔄 TRIGGERS E FUNÇÕES

### 1. Atualizar `updated_at` Automaticamente

```sql
-- Função já existe no sistema (update_updated_at_column)
-- Apenas criar trigger para tabela tarefas
CREATE TRIGGER update_tarefas_updated_at 
    BEFORE UPDATE ON tarefas
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Preencher `data_conclusao` Automaticamente

```sql
CREATE OR REPLACE FUNCTION set_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando status muda para 'feito', preenche data_conclusao
    IF NEW.status = 'feito' AND (OLD.status != 'feito' OR OLD.status IS NULL) THEN
        NEW.data_conclusao = CURRENT_DATE;
    -- Quando status muda de 'feito' para outro, limpa data_conclusao
    ELSIF NEW.status != 'feito' AND OLD.status = 'feito' THEN
        NEW.data_conclusao = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_data_conclusao
    BEFORE UPDATE ON tarefas
    FOR EACH ROW
    EXECUTE FUNCTION set_data_conclusao();
```

### 3. Validar Nome Não Vazio

```sql
-- Constraint já definida na criação da tabela
CONSTRAINT check_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
```

---

## 📈 ÍNDICES E PERFORMANCE

### Índices Criados

1. **`idx_tarefas_user_status`**
   - Campos: `(user_id, status, ordem)`
   - Uso: Buscar tarefas do Kanban ordenadas
   - Tipo: B-tree

2. **`idx_tarefas_user_data`**
   - Campos: `(user_id, data_vencimento)`
   - Uso: Buscar tarefas para calendário
   - Tipo: B-tree

3. **`idx_tarefas_user_prioridade`**
   - Campos: `(user_id, prioridade, data_vencimento)`
   - Uso: Ordenação por prioridade
   - Tipo: B-tree

4. **`idx_tarefas_status`** (Parcial)
   - Campos: `(status)`
   - Condição: `WHERE status != 'feito'`
   - Uso: Buscar tarefas pendentes para notificações
   - Tipo: B-tree parcial

5. **`idx_notificacoes_tarefa`** (Parcial)
   - Campos: `(tarefa_id)`
   - Condição: `WHERE tarefa_id IS NOT NULL`
   - Uso: Buscar notificações de uma tarefa
   - Tipo: B-tree parcial

---

## 🧪 DADOS DE TESTE (Seed)

```sql
-- Exemplos de tarefas para teste
INSERT INTO tarefas (user_id, nome, tipo, status, prioridade, data_vencimento, descricao) VALUES
-- Tarefas não iniciadas
((SELECT id FROM users LIMIT 1), 'Férias João', 'FÉRIAS', 'nao_iniciado', 'alta', CURRENT_DATE + 5, 'Processar férias do colaborador João'),
((SELECT id FROM users LIMIT 1), 'Fechamento folha março', NULL, 'nao_iniciado', 'media', CURRENT_DATE + 10, NULL),
((SELECT id FROM users LIMIT 1), 'Rescisão colaborador X', 'RESCISÃO', 'nao_iniciado', 'alta', CURRENT_DATE + 3, 'Processar rescisão'),

-- Tarefas em andamento
((SELECT id FROM users LIMIT 1), 'Enviar obrigação acessória', NULL, 'em_andamento', 'media', CURRENT_DATE + 1, 'DCTF Web do mês anterior'),
((SELECT id FROM users LIMIT 1), '13° Adiantamento Maria', '13° ADIANTAMENTO', 'em_andamento', 'baixa', CURRENT_DATE + 7, NULL),

-- Tarefas concluídas
((SELECT id FROM users LIMIT 1), 'Admissão novo colaborador', 'ADMISSÃO', 'feito', 'alta', CURRENT_DATE - 5, 'Processo completo'),
((SELECT id FROM users LIMIT 1), 'Alteração salarial equipe', 'ALTERAÇÃO SALARIAL', 'feito', 'media', CURRENT_DATE - 2, NULL);
```

---

## 🔐 SEGURANÇA E VALIDAÇÕES

### Validações no Banco

1. **Nome obrigatório e não vazio:**
   ```sql
   CONSTRAINT check_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
   ```

2. **Status válido:**
   ```sql
   CONSTRAINT check_status CHECK (status IN ('nao_iniciado', 'em_andamento', 'feito'))
   ```

3. **Prioridade válida:**
   ```sql
   CONSTRAINT check_prioridade CHECK (prioridade IN ('alta', 'media', 'baixa'))
   ```

4. **Foreign Key:**
   ```sql
   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
   ```
   - Se usuário for deletado, tarefas são deletadas automaticamente

5. **Foreign Key em Notificações:**
   ```sql
   tarefa_id UUID REFERENCES tarefas(id) ON DELETE SET NULL
   ```
   - Se tarefa for deletada, notificação mantém-se mas perde referência

### Validações na Aplicação (Além do Banco)

1. **Data de vencimento:**
   - Não pode ser no passado? (decidir regra de negócio)
   - Ou pode ser no passado para tarefas atrasadas?

2. **Permissões:**
   - Usuário só pode ver/editar/excluir suas próprias tarefas
   - Admin pode ver todas (se necessário)

3. **Sanitização:**
   - Escapar HTML em nome e descrição
   - Validar tamanho máximo de campos

---

## 📝 MIGRATION SQL COMPLETA

```sql
-- ============================================
-- MIGRATION: 006_create_tarefas.sql
-- Sistema de Controle de Tarefas
-- ============================================

-- Criar tabela tarefas
CREATE TABLE IF NOT EXISTS tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'nao_iniciado',
    prioridade VARCHAR(10) NOT NULL DEFAULT 'media',
    data_vencimento DATE NOT NULL,
    data_conclusao DATE,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_status CHECK (status IN ('nao_iniciado', 'em_andamento', 'feito')),
    CONSTRAINT check_prioridade CHECK (prioridade IN ('alta', 'media', 'baixa')),
    CONSTRAINT check_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
);

-- Criar índices
CREATE INDEX idx_tarefas_user_status ON tarefas(user_id, status, ordem);
CREATE INDEX idx_tarefas_user_data ON tarefas(user_id, data_vencimento);
CREATE INDEX idx_tarefas_user_prioridade ON tarefas(user_id, prioridade, data_vencimento);
CREATE INDEX idx_tarefas_status ON tarefas(status) WHERE status != 'feito';

-- Criar triggers
CREATE TRIGGER update_tarefas_updated_at 
    BEFORE UPDATE ON tarefas
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION set_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'feito' AND (OLD.status != 'feito' OR OLD.status IS NULL) THEN
        NEW.data_conclusao = CURRENT_DATE;
    ELSIF NEW.status != 'feito' AND OLD.status = 'feito' THEN
        NEW.data_conclusao = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_data_conclusao
    BEFORE UPDATE ON tarefas
    FOR EACH ROW
    EXECUTE FUNCTION set_data_conclusao();

-- Estender tabela notificacoes (se campo não existir)
ALTER TABLE notificacoes 
ADD COLUMN IF NOT EXISTS tarefa_id UUID REFERENCES tarefas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notificacoes_tarefa ON notificacoes(tarefa_id) WHERE tarefa_id IS NOT NULL;
```

---

**Documento criado em:** 2024
**Versão:** 1.0
**Tipo:** Schema de Dados Detalhado

