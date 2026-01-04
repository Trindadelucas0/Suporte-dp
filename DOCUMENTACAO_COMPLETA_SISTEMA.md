# 📋 Documentação Completa - Sistema Suporte DP

## 📖 Visão Geral

O **Suporte DP** é um sistema SaaS completo para gestão de Departamento Pessoal, oferecendo ferramentas para cálculos trabalhistas, gestão de calendário, checklists e organização de informações relacionadas a recursos humanos.

### Objetivo
Fornecer uma solução completa e acessível para profissionais de DP que precisam realizar cálculos trabalhistas, gerenciar obrigações, manter checklists e organizar informações de forma eficiente.

### Público-Alvo
- Profissionais de Departamento Pessoal
- Empresas que precisam calcular encargos trabalhistas
- Gestores de RH que precisam organizar processos e obrigações

### Problemas Resolvidos
- **Ganho de tempo**: Cálculos automáticos de INSS, IRRF, FGTS, férias, 13º salário
- **Redução de erros**: Cálculos padronizados e verificados
- **Organização**: Centralização de informações e obrigações
- **Simplicidade**: Interface intuitiva e fácil de usar
- **Acesso remoto**: Sistema web acessível de qualquer lugar

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

#### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **EJS** - Template engine
- **PostgreSQL** - Banco de dados relacional
- **bcrypt** - Hash de senhas
- **express-session** + **connect-pg-simple** - Gerenciamento de sessões
- **Helmet.js** - Segurança HTTP
- **csurf** - Proteção CSRF
- **express-rate-limit** - Rate limiting
- **nodemailer** - Envio de emails
- **axios** - Cliente HTTP (para APIs externas)

#### Frontend
- **Tailwind CSS** - Framework CSS utilitário
- **Font Awesome** - Ícones
- **JavaScript Vanilla** - Interatividade

#### Integrações
- **InfinitePay** - Gateway de pagamento
- **SMTP** - Envio de emails (configurável)

### Estrutura de Diretórios

```
Suporte-dp/
├── config/              # Configurações do sistema
│   ├── database.js      # Conexão PostgreSQL
│   └── ...
├── controllers/         # Lógica de negócio
│   ├── adminController.js
│   ├── authController.js
│   ├── dashboardController.js
│   ├── renovarController.js
│   ├── webhookController.js
│   └── ...
├── middleware/          # Middlewares Express
│   ├── auth.js         # Autenticação e autorização
│   └── ...
├── migrations/          # Scripts SQL de migração
│   └── 001_create_tables.sql
├── models/             # Modelos de dados
│   ├── User.js
│   ├── Payment.js
│   ├── Order.js
│   └── ...
├── routes/             # Definição de rotas
│   ├── admin.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── renovar.js
│   └── ...
├── services/           # Serviços externos
│   ├── infinitepayService.js
│   ├── emailService.js
│   └── ...
├── views/              # Templates EJS
│   ├── admin/
│   ├── auth/
│   ├── partials/
│   └── ...
├── scripts/            # Scripts utilitários
│   └── cleanup-pending-orders.js
├── public/             # Arquivos estáticos
├── server.js           # Arquivo principal
└── package.json        # Dependências
```

---

## 💾 Modelo de Dados

### Tabelas Principais

#### `users`
Armazena informações dos usuários do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `nome` | VARCHAR | Nome completo |
| `email` | VARCHAR | Email (único) |
| `senha_hash` | VARCHAR | Hash da senha (bcrypt) |
| `is_admin` | BOOLEAN | Indica se é administrador |
| `status` | VARCHAR | Status da conta (ativo/inativo) |
| `bloqueado` | BOOLEAN | Se a conta está bloqueada |
| `subscription_status` | VARCHAR | Status da assinatura (ativa/inadimplente) |
| `subscription_expires_at` | DATE | Data de expiração da assinatura |
| `order_nsu` | UUID | ID do pedido de pagamento inicial |
| `whatsapp` | VARCHAR | Número do WhatsApp |
| `last_login` | TIMESTAMP | Último login |
| `ultima_atividade` | TIMESTAMP | Última atividade |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

#### `orders`
Armazena pedidos de pagamento (primeiro pagamento e renovações).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `order_nsu` | UUID | NSU do pedido (único) |
| `status` | VARCHAR | Status (pending/paid/cancelled) |
| `valor` | DECIMAL(10,2) | Valor do pedido |
| `checkout_url` | TEXT | URL do checkout InfinitePay |
| `invoice_slug` | VARCHAR | Slug da invoice InfinitePay |
| `user_id` | UUID | ID do usuário (renovação) |
| `data_criacao` | TIMESTAMP | Data de criação |
| `created_at` | TIMESTAMP | Timestamp de criação |
| `updated_at` | TIMESTAMP | Última atualização |

#### `payments`
Armazena histórico de pagamentos processados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `order_nsu` | UUID | NSU do pedido relacionado |
| `user_id` | UUID | ID do usuário |
| `transaction_nsu` | VARCHAR | NSU da transação InfinitePay |
| `invoice_slug` | VARCHAR | Slug da invoice |
| `amount` | DECIMAL(10,2) | Valor original |
| `paid_amount` | DECIMAL(10,2) | Valor pago |
| `capture_method` | VARCHAR | Método de captura (credit_card, etc) |
| `receipt_url` | TEXT | URL do recibo |
| `status` | VARCHAR | Status (paid/pending/cancelled) |
| `paid_at` | TIMESTAMP | Data/hora do pagamento |
| `next_billing_date` | DATE | Próxima data de cobrança (30 dias) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

#### Tabelas de Funcionalidades
- `calculos_inss` - Cálculos de INSS
- `calculos_irrf` - Cálculos de IRRF
- `calculos_fgts` - Cálculos de FGTS
- `calculos_avos` - Cálculos de avos
- `calculos_periculosidade` - Cálculos de periculosidade
- `calculos_custo` - Cálculos de custo
- `calculos_data_base` - Cálculos de data base
- `calculos_contrato_experiencia` - Cálculos de contrato experiência
- `checklists` - Checklists do usuário
- `calendario_anotacoes` - Anotações do calendário
- `calendario_obrigacoes` - Obrigações do calendário
- `notificacoes` - Notificações do sistema
- `sugestoes_bugs` - Sugestões e bugs reportados

---

## 🔄 Fluxos Principais

### 1. Fluxo de Aquisição (Primeiro Pagamento)

```
1. Usuário acessa /adquirir
2. Sistema cria Order no banco (status: pending)
3. Sistema gera link de checkout InfinitePay
4. Usuário é redirecionado para InfinitePay
5. Usuário realiza pagamento
6. InfinitePay redireciona para /register?order_nsu=XXX
7. Usuário preenche formulário de cadastro
8. Sistema cria usuário no banco
9. Sistema vincula payment ao usuário
10. Webhook InfinitePay confirma pagamento (assíncrono)
11. Sistema atualiza subscription_expires_at (30 dias)
12. Usuário é redirecionado para /dashboard
```

### 2. Fluxo de Renovação

```
1. Usuário com assinatura expirada tenta fazer login
2. Sistema bloqueia login e redireciona para /renovar
3. Usuário acessa /renovar
4. Sistema valida elegibilidade (30 dias desde último pagamento OU expirado)
5. Sistema cria novo Order (status: pending)
6. Sistema gera link de checkout InfinitePay
7. Usuário é redirecionado para InfinitePay
8. Usuário realiza pagamento
9. InfinitePay redireciona para /login?renovado=true
10. Webhook InfinitePay confirma pagamento (assíncrono)
11. Sistema atualiza subscription_expires_at (30 dias a partir do pagamento)
12. Sistema atualiza subscription_status para 'ativa'
13. Usuário faz login normalmente
```

### 3. Fluxo de Webhook InfinitePay

```
1. InfinitePay envia POST para /webhook/infinitepay
2. Sistema valida webhook (HMAC se configurado)
3. Sistema responde 200 OK (rápido)
4. Processamento assíncrono (setImmediate):
   a. Verifica se payment já foi processado (transaction_nsu)
   b. Cria/atualiza registro em payments
   c. Atualiza status do order para 'paid'
   d. Se usuário existe: atualiza subscription (RENOVAÇÃO)
   e. Se usuário não existe: aguarda cadastro (PRIMEIRO PAGAMENTO)
   f. Envia email de confirmação (se SMTP configurado)
5. Sistema finaliza processamento
```

### 4. Fluxo de Autenticação

```
1. Usuário acessa /login
2. Usuário preenche email e senha
3. Sistema valida credenciais
4. Sistema verifica se conta está ativa/não bloqueada
5. Se NÃO for admin:
   - Verifica subscription_status
   - Verifica subscription_expires_at
   - Bloqueia login se expirado/inadimplente
6. Se for admin: permite login sempre
7. Sistema atualiza last_login e ultima_atividade
8. Sistema cria sessão
9. Sistema redireciona para /dashboard
```

### 5. Fluxo de Bloqueio Automático

```
1. Script/cron job executa periodicamente
2. Busca usuários com subscription_expires_at < hoje
3. Busca usuários sem pagamento há mais de 30 dias
4. Atualiza subscription_status para 'inadimplente'
5. Usuário não consegue mais fazer login
6. Usuário precisa renovar para acessar novamente
```

---

## 🔐 Segurança

### Autenticação e Autorização

- **Sessões**: Gerenciadas via `express-session` com armazenamento em PostgreSQL
- **Hash de Senhas**: bcrypt com salt rounds 10
- **Proteção CSRF**: Tokens CSRF em formulários
- **Rate Limiting**: Limite de requisições por IP
- **Helmet.js**: Headers de segurança HTTP
- **Validação de Entrada**: Express Validator

### Verificação de Assinatura

- **Middleware `requireActiveSubscription`**: Verifica assinatura ativa em todas as rotas protegidas
- **Admins**: Bypass automático (não precisam pagar)
- **Clientes**: Bloqueados se assinatura expirada/inadimplente

### Webhook Security

- **HMAC Signature**: Validação opcional via `INFINITEPAY_WEBHOOK_SECRET`
- **Validação de Payload**: Estrutura e campos obrigatórios
- **Idempotência**: Verificação de `transaction_nsu` para evitar duplicação

### Transações SQL

- **ACID**: Operações críticas (pagamento, cadastro) envolvidas em transações SQL
- **Rollback Automático**: Em caso de erro, todas as operações são revertidas

---

## 💳 Sistema de Pagamentos

### InfinitePay Integration

#### Configuração
```env
INFINITEPAY_HANDLE=seu-handle
INFINITEPAY_API_KEY=sua-api-key (opcional)
INFINITEPAY_WEBHOOK_SECRET=seu-secret (opcional, para HMAC)
APP_URL=https://seu-dominio.com
```

#### Endpoints Utilizados
- **POST /v2/checkout**: Criação de link de checkout
- **Webhook**: Recebimento de notificações de pagamento

#### Valor do Sistema
- **R$ 19,90** mensais
- **30 dias** de acesso por pagamento

### Status de Pagamento

- **pending**: Aguardando pagamento
- **paid**: Pagamento confirmado
- **cancelled**: Pedido cancelado/expirado

### Cleanup de Pedidos

- Script `cleanup-pending-orders.js` cancela pedidos pendentes há mais de 24 horas
- Pode ser executado via cron job

---

## 📧 Sistema de Emails

### Configuração SMTP

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha-de-app
SMTP_FROM=noreply@seudominio.com
```

### Emails Enviados

1. **Confirmação de Pagamento**: Enviado após webhook confirmar pagamento
   - Inclui link para cadastro (primeiro pagamento)
   - Inclui confirmação de pagamento

---

## 👥 Sistema de Usuários

### Tipos de Usuário

#### Admin
- Acesso completo ao sistema
- Não precisa pagar assinatura
- Painel administrativo completo
- Gerenciamento de usuários

#### Cliente
- Precisa pagar assinatura para acessar
- 30 dias de acesso por pagamento
- Acesso a todas as funcionalidades de cálculo
- Gestão de calendário e checklists

### Gestão de Assinatura

- **Status**: `ativa` | `inadimplente` | `null`
- **Expiração**: `subscription_expires_at` (DATE)
- **Renovação**: Manual, via `/renovar`
- **Bloqueio**: Automático após expiração

---

## 🎛️ Painel Administrativo

### Funcionalidades

1. **Dashboard**
   - Estatísticas de usuários
   - Visão geral do sistema

2. **Gestão de Usuários**
   - Listagem completa de usuários
   - Informações de pagamento:
     - Status de pagamento (Pago/Expirado/Vencendo/Não Pago)
     - Dias restantes até expiração
     - Último pagamento (valor, data, método)
     - Total de pagamentos
     - Valor total pago
   - Status de assinatura
   - Último login
   - Ativar/Desativar usuários
   - Bloquear/Desbloquear usuários
   - Ver detalhes completos do usuário

3. **Detalhes do Usuário**
   - Informações completas do perfil
   - Histórico de pagamentos
   - Cálculos realizados
   - Checklists
   - Anotações e obrigações do calendário
   - Sugestões/bugs reportados

4. **Notificações**
   - Envio de notificações para usuários
   - Histórico de notificações enviadas

---

## 🔧 Funcionalidades do Sistema

### Cálculos Trabalhistas

1. **INSS**: Cálculo de contribuição INSS
2. **IRRF**: Cálculo de imposto de renda retido na fonte
3. **FGTS**: Cálculo de FGTS
4. **Avos**: Cálculo de avos de férias
5. **Periculosidade**: Cálculo de adicional de periculosidade
6. **Custo**: Cálculo de custo total do funcionário
7. **Data Base**: Cálculos de data base
8. **Contrato Experiência**: Cálculos de contrato de experiência

### Calendário

- **Anotações**: Anotações pessoais do usuário
- **Obrigações**: Obrigações trabalhistas e prazos

### Checklists

- Checklists personalizados do usuário
- Organização de tarefas e processos

### Sugestões e Bugs

- Usuários podem reportar sugestões e bugs
- Administradores podem visualizar e gerenciar

---

## 🌐 Rotas Principais

### Públicas
- `GET /` - Página inicial (landing page)
- `GET /adquirir` - Página de aquisição do sistema
- `POST /adquirir` - Criação de pedido de pagamento
- `GET /login` - Página de login
- `POST /login` - Processamento de login
- `GET /register` - Página de cadastro (após pagamento)
- `POST /register` - Processamento de cadastro
- `GET /logout` - Logout
- `POST /webhook/infinitepay` - Webhook InfinitePay

### Protegidas (Require Auth)
- `GET /dashboard` - Dashboard do usuário
- `GET /renovar` - Página de renovação
- `POST /renovar` - Processamento de renovação
- Rotas de cálculos (INSS, IRRF, FGTS, etc.)
- Rotas de calendário
- Rotas de checklists

### Admin (Require Admin)
- `GET /admin` - Dashboard administrativo
- `GET /admin/usuarios` - Listagem de usuários
- `GET /admin/usuarios/:id` - Detalhes do usuário
- `POST /admin/usuarios/:id/toggle-status` - Ativar/Desativar usuário
- `POST /admin/usuarios/:id/toggle-block` - Bloquear/Desbloquear usuário
- `GET /admin/notificacoes` - Gerenciamento de notificações
- `POST /admin/notificacoes` - Criar notificação

---

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Servidor
NODE_ENV=production
PORT=3000
APP_URL=https://seu-dominio.com
APP_NAME=Suporte DP

# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@host:porta/database

# Sessões
SESSION_SECRET=seu-secret-aleatorio

# InfinitePay
INFINITEPAY_HANDLE=seu-handle
INFINITEPAY_API_KEY=sua-api-key (opcional)
INFINITEPAY_WEBHOOK_SECRET=seu-secret (opcional)

# SMTP (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha-de-app
SMTP_FROM=noreply@seudominio.com

# Segurança
CSRF_SECRET=seu-secret-csrf
```

### Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Executar migrações
# Executar scripts SQL em migrations/

# 4. Iniciar servidor
npm start
# ou
node server.js
```

---

## 📊 Scripts Utilitários

### Cleanup de Pedidos Pendentes

```bash
npm run cleanup-pending-orders
```

- Cancela pedidos em status `pending` há mais de 24 horas
- Pode ser executado via cron job

---

## 🚀 Deploy

### Requisitos
- Node.js 14+
- PostgreSQL 12+
- Servidor web (Nginx recomendado)
- SSL/HTTPS (obrigatório para produção)

### Processo de Deploy

1. Clonar repositório
2. Instalar dependências: `npm install --production`
3. Configurar variáveis de ambiente
4. Executar migrações SQL
5. Iniciar aplicação: `npm start` ou usar PM2
6. Configurar reverse proxy (Nginx)
7. Configurar SSL (Let's Encrypt)
8. Configurar cron jobs (cleanup de pedidos)

---

## 📝 Notas Importantes

### Sobre Pagamentos
- Sistema usa modelo de assinatura mensal (30 dias)
- Renovação manual (usuário deve acessar `/renovar`)
- Valor fixo: R$ 19,90
- Admins não precisam pagar

### Sobre Segurança
- Sempre use HTTPS em produção
- Configure `SESSION_SECRET` forte
- Configure `INFINITEPAY_WEBHOOK_SECRET` para validar webhooks
- Mantenha dependências atualizadas

### Sobre Performance
- Use pool de conexões PostgreSQL
- Considere cache para queries frequentes
- Monitore performance do banco de dados
- Use CDN para assets estáticos

### Sobre Manutenção
- Execute cleanup de pedidos pendentes regularmente
- Monitore logs de webhook
- Monitore erros de pagamento
- Faça backups regulares do banco de dados

---

## 📞 Suporte

Para dúvidas, problemas ou sugestões, entre em contato através do sistema de sugestões/bugs no painel administrativo.

---

**Versão do Documento**: 1.0  
**Última Atualização**: 2024  
**Sistema**: Suporte DP - Gestão de Departamento Pessoal

