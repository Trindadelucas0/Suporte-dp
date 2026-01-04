# 🔄 DIAGRAMAS DE FLUXO - SISTEMA DE TAREFAS

## 📊 FLUXO PRINCIPAL: CICLO DE VIDA DA TAREFA

```
┌─────────────────────────────────────────────────────────────┐
│                    CRIAÇÃO DE TAREFA                        │
│  Usuário preenche: Nome* + Data* + (Tipo?) + (Prioridade?)  │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Sistema cria tarefa:                                        │
│  - status = 'nao_iniciado'                                   │
│  - prioridade = 'media' (padrão)                             │
│  - ordem = última + 1                                        │
└───────────────────────┬───────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│   KANBAN      │              │    CALENDÁRIO    │
│ Coluna:       │              │ Evento no dia    │
│ NÃO INICIADO  │              │ da data_venc.    │
└───────┬───────┘              └──────────────────┘
        │
        │ (Usuário arrasta card)
        ▼
┌─────────────────────────────────────────────────────────────┐
│  MUDANÇA DE STATUS                                           │
│  Drag & Drop entre colunas                                   │
└───────────────────────┬───────────────────────────────────┘
        │
        ├───► EM ANDAMENTO ────┐
        │                      │
        └───► FEITO ────────────┼───► data_conclusao = hoje
                                │
                                ▼
                        ┌───────────────┐
                        │  NOTIFICAÇÃO  │
                        │  (se vencendo)│
                        └───────────────┘
```

---

## 🔔 FLUXO DE NOTIFICAÇÕES

### Notificações Automáticas (Sistema)

```
┌─────────────────────────────────────────────────────────────┐
│  VERIFICAÇÃO PERIÓDICA (Login ou Job Diário)                │
└───────────────────────┬───────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Data = Hoje   │ │ Data < Hoje   │ │ Data = Amanhã│
│ Status ≠ Feito│ │ Status ≠ Feito│ │ Status =     │
│               │ │               │ │ Não Iniciado │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Notificação: │ │ Notificação:  │ │ Notificação:  │
│ "Vence hoje" │ │ "Atrasada"    │ │ "Vence amanhã"│
│ Tipo: warning│ │ Tipo: error   │ │ Tipo: info    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Salva em tabela      │
            │  notificacoes         │
            │  (lida = false)       │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Aparece no sino 🔔   │
            │  do header             │
            └───────────────────────┘
```

### Notificações Administrativas (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN ACESSA PAINEL DE NOTIFICAÇÕES                         │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Formulário:                                                 │
│  - Título*                                                   │
│  - Mensagem*                                                 │
│  - Destinatário: [Todos] [Usuário Específico]               │
│  - Tipo: info/warning/success/error                          │
└───────────────────────┬───────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ Para TODOS    │              │ Para USUÁRIO     │
│ (exceto admin)│              │ ESPECÍFICO       │
└───────┬───────┘              └────────┬─────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Cria notificação(ões)│
            │  para cada destinatário│
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Usuários veem no sino │
            │  🔔 ao acessar sistema │
            └───────────────────────┘
```

---

## 🎨 FLUXO DE INTERAÇÃO: KANBAN

```
┌─────────────────────────────────────────────────────────────┐
│  USUÁRIO ACESSA PÁGINA DE TAREFAS                           │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Sistema carrega tarefas      │
        │  agrupadas por status         │
        └───────────────┬───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  EXIBE 3 COLUNAS:                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ NÃO      │  │ EM        │  │ FEITO    │                │
│  │ INICIADO │  │ ANDAMENTO │  │          │                │
│  └──────────┘  └──────────┘  └──────────┘                │
└───────────────────────┬───────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Clica "+ Nova │ │ Arrasta Card  │ │ Clica Card    │
│ Tarefa"       │ │ entre colunas │ │ para editar   │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Abre Modal    │ │ Atualiza      │ │ Abre Modal    │
│ Formulário    │ │ status        │ │ com dados     │
└───────┬───────┘ └───────────────┘ └───────┬───────┘
        │                                   │
        ▼                                   ▼
┌───────────────┐                  ┌──────────────────┐
│ Cria tarefa   │                  │ Salva alterações │
│ e atualiza    │                  │ e atualiza       │
│ visual        │                  │ visual           │
└───────────────┘                  └──────────────────┘
```

---

## 📅 FLUXO DE INTEGRAÇÃO: CALENDÁRIO

```
┌─────────────────────────────────────────────────────────────┐
│  USUÁRIO ACESSA CALENDÁRIO                                   │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Sistema busca:               │
        │  - Anotações existentes       │
        │  - Obrigações existentes      │
        │  - TAREFAS (novo)             │
        └───────────────┬───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Para cada tarefa:                                          │
│  - Determina cor (tipo ou prioridade)                       │
│  - Cria evento no dia data_vencimento                       │
│  - Adiciona tooltip com nome                                │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  EXIBE NO CALENDÁRIO:                                        │
│  ┌─────────────────────────────────────┐                   │
│  │  [Anotação] [Obrigação] [Tarefa]    │                   │
│  │  [Tarefa] [Tarefa]                  │                   │
│  └─────────────────────────────────────┘                   │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Usuário clica em tarefa      │
        └───────────────┬───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Abre modal com:                                             │
│  - Nome da tarefa                                            │
│  - Tipo (se houver)                                          │
│  - Status atual                                              │
│  - Prioridade                                                │
│  - Data de vencimento                                        │
│  - Descrição                                                 │
│  - Botões: [Editar] [Fechar]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 FLUXO DE PERMISSÕES

```
┌─────────────────────────────────────────────────────────────┐
│  REQUISIÇÃO DO USUÁRIO                                       │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Middleware de Autenticação   │
        │  Verifica sessão              │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ Usuário       │              │ Admin            │
│ Comum         │              │ (is_admin=true)  │
└───────┬───────┘              └────────┬─────────┘
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ Pode:         │              │ Pode:            │
│ - Ver suas    │              │ - Tudo de usuário│
│   tarefas     │              │ - Criar notif.   │
│ - Criar suas  │              │   admin          │
│   tarefas     │              │ - Ver histórico  │
│ - Editar suas │              │   de notif.      │
│   tarefas     │              │                  │
│ - Excluir suas│              │                  │
│   tarefas     │              │                  │
└───────────────┘              └──────────────────┘
```

---

## 🎯 FLUXO DE PRIORIZAÇÃO E ORDENAÇÃO

```
┌─────────────────────────────────────────────────────────────┐
│  TAREFAS NO KANBAN                                           │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Ordenação Padrão:            │
        │  1. Prioridade                │
        │  2. Data de Vencimento        │
        │  3. Ordem Manual              │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ 🔴 ALTA       │ │ 🟡 MÉDIA      │ │ 🟢 BAIXA      │
│ (Primeiro)    │ │ (Segundo)     │ │ (Terceiro)    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └───────────────┼───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Dentro da mesma prioridade:  │
        │  Ordena por data_vencimento   │
        │  (mais próxima primeiro)      │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Se usuário arrastou manual:  │
        │  Respeita campo 'ordem'       │
        └───────────────────────────────┘
```

---

## 📱 FLUXO DE RESPONSIVIDADE (Mobile)

```
┌─────────────────────────────────────────────────────────────┐
│  DISPOSITIVO MÓVEL                                           │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Kanban vira scroll vertical  │
        │  (colunas empilhadas)         │
        └───────────────┬───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYOUT MOBILE:                                              │
│  ┌─────────────────────┐                                    │
│  │ NÃO INICIADO (2)    │                                    │
│  │ [Card] [Card]       │                                    │
│  ├─────────────────────┤                                    │
│  │ EM ANDAMENTO (1)    │                                    │
│  │ [Card]              │                                    │
│  ├─────────────────────┤                                    │
│  │ FEITO (5)           │                                    │
│  │ [Card] [Card] ...   │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO COMPLETO: EXEMPLO DE USO

```
1. USUÁRIO CRIA TAREFA
   └─► "Férias João" | Tipo: FÉRIAS | Data: 15/03 | Prioridade: Alta
       │
       ├─► Aparece no Kanban (coluna NÃO INICIADO)
       ├─► Aparece no Calendário (15/03, cor azul)
       └─► Sistema agenda verificação de notificação

2. DIA 14/03 (Véspera)
   └─► Sistema detecta: data_vencimento = amanhã
       │
       └─► Cria notificação: "Tarefa 'Férias João' vence amanhã"
           │
           └─► Aparece no sino 🔔 do usuário

3. DIA 15/03 (Vencimento)
   └─► Sistema detecta: data_vencimento = hoje
       │
       └─► Cria notificação: "Tarefa 'Férias João' vence hoje"
           │
           └─► Aparece no sino 🔔 do usuário

4. USUÁRIO TRABALHA NA TAREFA
   └─► Arrasta card para coluna EM ANDAMENTO
       │
       └─► Status atualizado automaticamente

5. USUÁRIO CONCLUI TAREFA
   └─► Arrasta card para coluna FEITO
       │
       ├─► Status = 'feito'
       ├─► data_conclusao = 15/03
       ├─► Notificações relacionadas são limpas
       └─► Tarefa aparece riscada no calendário
```

---

**Documento criado em:** 2024
**Versão:** 1.0
**Tipo:** Diagramas de Fluxo Complementares

