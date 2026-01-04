# 📋 ARQUITETURA DO SISTEMA DE CONTROLE DE TAREFAS

## 🎯 VISÃO GERAL

Sistema flexível de gestão de tarefas integrado ao calendário, com interface estilo Notion/Trello, focado em usabilidade e simplicidade. O sistema permite criação livre de tarefas sem categorias obrigatórias, oferecendo sugestões opcionais para facilitar a organização.

---

## 📊 ESTRUTURA CONCEITUAL DOS DADOS

### 1. TABELA: `tarefas`

**Campos Principais:**
- `id` (UUID) - Identificador único
- `user_id` (UUID) - Referência ao usuário criador (FK → users.id)
- `nome` (VARCHAR) - **NOME LIVRE** - campo obrigatório, sem restrições
- `tipo` (VARCHAR) - **OPCIONAL** - sugestões pré-definidas ou NULL
- `status` (ENUM) - **FIXO** - 'nao_iniciado', 'em_andamento', 'feito'
- `prioridade` (ENUM) - **FIXA** - 'alta', 'media', 'baixa'
- `data_vencimento` (DATE) - Data para aparecer no calendário
- `data_conclusao` (DATE) - Preenchida automaticamente quando status = 'feito'
- `descricao` (TEXT) - Campo opcional para detalhes
- `ordem` (INTEGER) - Ordem dentro da coluna do Kanban
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Índices:**
- `idx_tarefas_user_status` - Busca por usuário e status (para Kanban)
- `idx_tarefas_user_data` - Busca por usuário e data (para calendário)
- `idx_tarefas_user_prioridade` - Ordenação por prioridade

**Regras de Negócio:**
- `nome` é obrigatório e não pode ser vazio
- `tipo` é completamente opcional (pode ser NULL)
- `status` sempre inicia como 'nao_iniciado'
- `prioridade` sempre inicia como 'media'
- `data_vencimento` é obrigatória (toda tarefa precisa de data)
- Quando `status` muda para 'feito', `data_conclusao` é preenchida automaticamente

---

### 2. TABELA: `notificacoes_tarefas` (Extensão da tabela `notificacoes` existente)

**Campos Adicionais (se necessário):**
- `tarefa_id` (UUID) - Referência à tarefa (FK → tarefas.id) - **OPCIONAL**
- `tipo_notificacao` (VARCHAR) - 'tarefa_vencendo', 'tarefa_atrasada', 'tarefa_atribuida', 'admin_aviso'

**Lógica:**
- Reutiliza a tabela `notificacoes` existente
- Se `tarefa_id` for NULL, é notificação administrativa geral
- Se `tarefa_id` for preenchido, é notificação relacionada à tarefa específica

---

### 3. TIPOS DE TAREFA (Sugestões Opcionais)

**Valores Permitidos:**
- `FÉRIAS`
- `13° ADIANTAMENTO`
- `13° INTEGRAL`
- `RESCISÃO`
- `ADMISSÃO`
- `AFASTAMENTO`
- `ALTERAÇÃO SALARIAL`
- `ALTERAÇÃO DE CARGO`
- `OUTROS`

**Implementação:**
- Armazenado como VARCHAR no banco
- Select dropdown no formulário com opção "Selecione..." (valor NULL)
- Usuário pode deixar em branco sem problemas
- Campo não é validado (aceita qualquer valor ou NULL)

---

## 🔄 FLUXOS DO SISTEMA

### FLUXO 1: CRIAÇÃO DE TAREFA (Usuário)

```
1. Usuário acessa página de Tarefas (Kanban)
2. Clica em botão "+ Nova Tarefa" ou "+ Adicionar"
3. Modal/Formulário abre com campos:
   - Nome* (texto livre, obrigatório)
   - Tipo (select opcional, pode ficar vazio)
   - Prioridade* (select fixo: Alta/Média/Baixa, padrão: Média)
   - Data de Vencimento* (date picker, obrigatório)
   - Descrição (textarea opcional)
4. Usuário preenche campos (mínimo: Nome + Data)
5. Sistema valida:
   - Nome não pode ser vazio
   - Data não pode ser no passado (ou pode? - decidir regra)
6. Sistema cria tarefa com:
   - status = 'nao_iniciado'
   - ordem = última ordem da coluna + 1
   - user_id = usuário logado
7. Tarefa aparece na coluna "NÃO INICIADO" do Kanban
8. Tarefa aparece no calendário na data informada
9. Se data for hoje ou próxima (ex: 3 dias), cria notificação automática
```

**Validações:**
- ✅ Nome obrigatório e não vazio
- ✅ Data obrigatória
- ✅ Tipo opcional (pode ser NULL)
- ✅ Prioridade padrão: 'media'

---

### FLUXO 2: VISUALIZAÇÃO KANBAN (Usuário)

```
1. Usuário acessa página de Tarefas
2. Sistema carrega todas as tarefas do usuário agrupadas por status
3. Exibe 3 colunas:
   - NÃO INICIADO
   - EM ANDAMENTO
   - FEITO
4. Cada tarefa é um card arrastável com:
   - Nome da tarefa
   - Tipo (se existir, com badge/ícone)
   - Prioridade (indicador visual: cor/badge)
   - Data de vencimento
   - Botão de ações (editar, excluir)
5. Usuário pode:
   - Arrastar card entre colunas (muda status automaticamente)
   - Clicar no card para ver detalhes/editar
   - Filtrar por prioridade
   - Buscar por nome
```

**Ordenação:**
- Por padrão: Prioridade (Alta → Média → Baixa), depois Data de Vencimento
- Usuário pode reordenar manualmente (campo `ordem`)

---

### FLUXO 3: INTEGRAÇÃO COM CALENDÁRIO (Usuário)

```
1. Usuário acessa página de Calendário (já existe no sistema)
2. Sistema busca todas as tarefas do usuário com data_vencimento
3. Exibe no calendário:
   - Cada tarefa como evento no dia correspondente
   - Cor do evento baseada em:
     * Tipo da tarefa (se existir) - cores pré-definidas por tipo
     * Prioridade (se não houver tipo) - Alta: vermelho, Média: amarelo, Baixa: verde
   - Badge com número de tarefas no dia (se múltiplas)
4. Usuário clica no evento:
   - Abre modal com detalhes da tarefa
   - Opção de editar ou mudar status
5. Tarefas concluídas (status = 'feito') aparecem com visual diferenciado (riscado/opaco)
```

**Cores por Tipo (Sugestão):**
- FÉRIAS → Azul claro
- 13° ADIANTAMENTO → Laranja
- 13° INTEGRAL → Laranja escuro
- RESCISÃO → Vermelho
- ADMISSÃO → Verde
- AFASTAMENTO → Amarelo
- ALTERAÇÃO SALARIAL → Roxo
- ALTERAÇÃO DE CARGO → Azul
- OUTROS → Cinza
- Sem tipo → Cor baseada na prioridade

---

### FLUXO 4: NOTIFICAÇÕES AUTOMÁTICAS (Sistema)

```
1. Sistema verifica tarefas periodicamente (job/cron ou verificação ao login)
2. Para cada tarefa do usuário:
   a) Se data_vencimento = hoje E status != 'feito':
      → Cria notificação: "Tarefa 'X' vence hoje"
   b) Se data_vencimento < hoje E status != 'feito':
      → Cria notificação: "Tarefa 'X' está atrasada"
   c) Se data_vencimento = amanhã E status = 'nao_iniciado':
      → Cria notificação: "Tarefa 'X' vence amanhã"
3. Notificações aparecem no sino 🔔 do header
4. Usuário clica no sino:
   - Abre dropdown com notificações não lidas
   - Mostra contador de não lidas
   - Cada notificação tem link para a tarefa
5. Ao clicar na notificação:
   - Marca como lida
   - Redireciona para a tarefa/calendário
```

**Frequência de Verificação:**
- Opção 1: Verificação ao login do usuário
- Opção 2: Job diário (ex: 08:00) que cria notificações para todos
- Opção 3: Verificação em tempo real ao acessar dashboard

---

### FLUXO 5: NOTIFICAÇÕES ADMINISTRATIVAS (Admin)

```
1. Admin acessa painel administrativo
2. Vai para seção "Notificações" ou "Avisos"
3. Formulário para criar notificação:
   - Título* (obrigatório)
   - Mensagem* (obrigatório)
   - Destinatário:
     * Radio: "Todos os usuários" OU "Usuário específico"
     * Se específico: Select com lista de usuários
   - Tipo: info, warning, success, error
4. Admin preenche e envia
5. Sistema cria notificação(ões):
   - Se "Todos": Uma notificação para cada usuário (exceto admin)
   - Se "Específico": Uma notificação para o usuário selecionado
6. Notificações aparecem no sino 🔔 dos usuários
7. Usuários visualizam e marcam como lidas
```

**Permissões:**
- Apenas usuários com `is_admin = true` podem criar notificações administrativas
- Admin pode ver todas as notificações enviadas (histórico)

---

### FLUXO 6: EDIÇÃO DE TAREFA (Usuário)

```
1. Usuário clica em tarefa (card ou calendário)
2. Modal/Formulário abre com dados atuais
3. Usuário pode editar:
   - Nome
   - Tipo (pode remover seleção)
   - Status (pode mudar diretamente)
   - Prioridade
   - Data de vencimento
   - Descrição
4. Sistema valida (mesmas regras de criação)
5. Sistema atualiza tarefa
6. Se status mudou para 'feito':
   - Preenche data_conclusao = hoje
7. Se status mudou de 'feito' para outro:
   - Limpa data_conclusao
8. Atualiza visual no Kanban e Calendário
```

---

### FLUXO 7: EXCLUSÃO DE TAREFA (Usuário)

```
1. Usuário clica em botão "Excluir" na tarefa
2. Sistema pede confirmação: "Tem certeza que deseja excluir esta tarefa?"
3. Se confirmar:
   - Remove tarefa do banco
   - Remove notificações relacionadas (se houver)
   - Atualiza visual (remove do Kanban e Calendário)
4. Se cancelar: Nada acontece
```

**Regra:**
- Usuário só pode excluir suas próprias tarefas
- Admin pode excluir qualquer tarefa (se necessário)

---

## 🎨 INTERFACE E UX

### PÁGINA KANBAN (Principal)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Header com Navbar]                                    │
├─────────────────────────────────────────────────────────┤
│  📋 Tarefas                    [+ Nova Tarefa] [🔍] [⚙️]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ NÃO INICIADO │  │ EM ANDAMENTO │  │    FEITO     │  │
│  │    (5)       │  │     (3)      │  │    (12)      │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ [Card 1]     │  │ [Card 4]     │  │ [Card 7]     │  │
│  │ [Card 2]     │  │ [Card 5]     │  │ [Card 8]     │  │
│  │ [Card 3]     │  │ [Card 6]     │  │ [Card 9]     │  │
│  │              │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Card de Tarefa:**
```
┌─────────────────────────────┐
│ 🔴 ALTA  [Badge Tipo]       │
│                             │
│ Férias João                 │
│ 📅 15/03/2024               │
│                             │
│ [✏️ Editar] [🗑️ Excluir]    │
└─────────────────────────────┘
```

**Características:**
- Cards arrastáveis (drag & drop)
- Visual limpo estilo Notion/Trello
- Cores sutis para prioridade
- Badge discreto para tipo
- Responsivo (mobile-friendly)

---

### INTEGRAÇÃO NO CALENDÁRIO

**Visualização:**
- Eventos coloridos por tipo/prioridade
- Hover mostra tooltip com nome da tarefa
- Click abre modal com detalhes
- Tarefas concluídas aparecem riscadas/opacas

---

### NOTIFICAÇÕES (Sino 🔔)

**Dropdown:**
```
┌─────────────────────────────────┐
│ 🔔 Notificações (3 não lidas)   │
├─────────────────────────────────┤
│ ⚠️ Tarefa "X" vence hoje        │
│ ⚠️ Tarefa "Y" está atrasada     │
│ ℹ️ Aviso do administrador       │
│                                 │
│ [Marcar todas como lidas]      │
└─────────────────────────────────┘
```

**Características:**
- Contador de não lidas no ícone
- Badge de tipo (info/warning/success/error)
- Link para tarefa/contexto
- Marcar como lida individual ou em massa

---

## 🔐 PERMISSÕES E SEGURANÇA

### REGRAS DE ACESSO

**Usuário Comum:**
- ✅ Criar suas próprias tarefas
- ✅ Editar suas próprias tarefas
- ✅ Excluir suas próprias tarefas
- ✅ Ver apenas suas tarefas
- ✅ Receber notificações sobre suas tarefas
- ❌ Não pode criar notificações administrativas

**Administrador:**
- ✅ Tudo que usuário comum pode fazer
- ✅ Criar notificações para todos os usuários
- ✅ Criar notificações para usuário específico
- ✅ Ver histórico de notificações enviadas
- ⚠️ Pode excluir tarefas de outros (se necessário, com aviso)

---

## 🗄️ ESTRUTURA DE ARQUIVOS (Conceitual)

### NOVOS ARQUIVOS NECESSÁRIOS

```
controllers/
  └── tarefasController.js      # CRUD de tarefas
  └── notificacoesController.js # Gestão de notificações (se não existir)

models/
  └── Tarefa.js                 # Model de tarefa
  └── Notificacao.js            # Model de notificação (se não existir)

services/
  └── tarefasService.js         # Lógica de negócio de tarefas
  └── notificacoesService.js    # Lógica de notificações automáticas

routes/
  └── tarefas.js                # Rotas de tarefas
  └── notificacoes.js           # Rotas de notificações (se não existir)

views/
  └── tarefas/
      └── index.ejs             # Página Kanban
      └── form.ejs              # Modal/Form de criar/editar
  └── admin/
      └── notificacoes.ejs      # Painel de notificações admin

public/
  └── js/
      └── kanban.js             # Lógica drag & drop
      └── tarefas.js            # Interações de tarefas
  └── css/
      └── kanban.css            # Estilos do Kanban

database/
  └── migrations/
      └── 006_create_tarefas.sql # Migration da tabela tarefas
```

---

## 🔄 INTEGRAÇÃO COM SISTEMA EXISTENTE

### PONTOS DE INTEGRAÇÃO

1. **Autenticação:**
   - Usa `req.session.user` existente
   - Usa middleware `auth.js` existente

2. **Calendário:**
   - Integra com `calendarioController.js` existente
   - Adiciona eventos de tarefas aos eventos existentes

3. **Notificações:**
   - Usa tabela `notificacoes` existente
   - Adiciona campo `tarefa_id` (opcional) via migration

4. **Navbar:**
   - Adiciona link "Tarefas" no menu
   - Integra contador de notificações no sino existente

5. **Dashboard:**
   - Pode mostrar resumo de tarefas pendentes
   - Widget com tarefas do dia

---

## 📅 LÓGICA DE NOTIFICAÇÕES AUTOMÁTICAS

### REGRAS DE CRIAÇÃO

**Notificação "Vence Hoje":**
```
SE data_vencimento = hoje
E status != 'feito'
ENTÃO criar notificação tipo 'warning'
```

**Notificação "Atrasada":**
```
SE data_vencimento < hoje
E status != 'feito'
ENTÃO criar notificação tipo 'error'
```

**Notificação "Vence Amanhã":**
```
SE data_vencimento = amanhã
E status = 'nao_iniciado'
ENTÃO criar notificação tipo 'info'
```

**Frequência:**
- Verificação ao login do usuário
- Job diário às 08:00 (opcional, para notificações proativas)

**Evitar Duplicatas:**
- Não criar notificação se já existe uma não lida para a mesma tarefa e tipo
- Limpar notificações antigas de tarefas já concluídas

---

## 🎯 PRIORIDADES E ORDENAÇÃO

### SISTEMA DE PRIORIDADE

**Alta:**
- Cor: Vermelho (#ef4444)
- Badge: "🔴 ALTA"
- Ordenação: Primeira posição

**Média:**
- Cor: Amarelo (#f59e0b)
- Badge: "🟡 MÉDIA"
- Ordenação: Segunda posição
- **Padrão ao criar tarefa**

**Baixa:**
- Cor: Verde (#10b981)
- Badge: "🟢 BAIXA"
- Ordenação: Terceira posição

**Ordenação no Kanban:**
1. Prioridade (Alta → Média → Baixa)
2. Data de Vencimento (mais próxima primeiro)
3. Ordem manual (se usuário arrastou)

---

## 🧪 CASOS DE USO

### CASO 1: Criar Tarefa Simples
```
Usuário: "Preciso lembrar de processar férias do João"
Ação: Cria tarefa "Férias João" com data 15/03
Resultado: Aparece no Kanban e Calendário
```

### CASO 2: Criar Tarefa com Tipo
```
Usuário: "Vou criar tarefa de rescisão"
Ação: Cria tarefa "Rescisão colaborador X", tipo "RESCISÃO", data 20/03
Resultado: Aparece com badge "RESCISÃO" e cor vermelha no calendário
```

### CASO 3: Mover Tarefa no Kanban
```
Usuário: Arrasta card de "NÃO INICIADO" para "EM ANDAMENTO"
Ação: Sistema atualiza status automaticamente
Resultado: Card muda de coluna, ordem preservada
```

### CASO 4: Tarefa Vencendo
```
Sistema: Detecta tarefa com data = hoje e status != 'feito'
Ação: Cria notificação "Tarefa 'X' vence hoje"
Resultado: Usuário vê notificação no sino 🔔
```

### CASO 5: Admin Envia Aviso
```
Admin: Cria notificação "Lembrete: Fechamento de folha amanhã"
Destinatário: Todos os usuários
Ação: Sistema cria notificação para cada usuário
Resultado: Todos veem aviso no sino 🔔
```

---

## 🚀 MELHORIAS FUTURAS (Opcional)

### FASE 2 (Não Implementar Agora)

1. **Atribuição de Tarefas:**
   - Admin pode atribuir tarefa para outro usuário
   - Campo `atribuido_para` na tabela

2. **Comentários:**
   - Tabela `tarefa_comentarios`
   - Usuários podem comentar em tarefas

3. **Anexos:**
   - Upload de arquivos relacionados à tarefa
   - Tabela `tarefa_anexos`

4. **Etiquetas/Tags:**
   - Sistema de tags livre (além do tipo)
   - Múltiplas tags por tarefa

5. **Filtros Avançados:**
   - Filtrar por tipo, prioridade, data
   - Busca textual avançada

6. **Relatórios:**
   - Tarefas concluídas no mês
   - Tarefas atrasadas
   - Produtividade do usuário

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO (Futuro)

Quando autorizado a implementar:

- [ ] Criar migration da tabela `tarefas`
- [ ] Criar Model `Tarefa.js`
- [ ] Criar Controller `tarefasController.js`
- [ ] Criar Service `tarefasService.js`
- [ ] Criar Rotas `tarefas.js`
- [ ] Criar View Kanban `tarefas/index.ejs`
- [ ] Criar View Form `tarefas/form.ejs`
- [ ] Implementar drag & drop (JavaScript)
- [ ] Integrar com calendário existente
- [ ] Implementar notificações automáticas
- [ ] Criar painel admin de notificações
- [ ] Adicionar link no navbar
- [ ] Testes unitários
- [ ] Testes de integração

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Flexibilidade:**
   - Sistema não impõe categorias rígidas
   - Usuário tem liberdade total no nome
   - Tipo é apenas sugestão, não obrigatório

2. **Simplicidade:**
   - Interface limpa e intuitiva
   - Mínimo de cliques para ações comuns
   - Visual não poluído

3. **Performance:**
   - Índices no banco para consultas rápidas
   - Carregamento lazy de tarefas (paginação se necessário)
   - Cache de notificações não lidas

4. **Usabilidade:**
   - Feedback visual em todas as ações
   - Confirmação em ações destrutivas
   - Mensagens de erro claras

---

**Documento criado em:** 2024
**Versão:** 1.0
**Status:** 📋 PROJETO - Aguardando autorização para implementação

