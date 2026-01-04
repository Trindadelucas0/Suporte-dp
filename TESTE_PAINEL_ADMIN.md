# 🧪 Guia de Teste - Painel Admin de Assinaturas

Este guia ajuda você a testar as funcionalidades de assinatura no localhost.

## 📋 Pré-requisitos

1. **PostgreSQL instalado e rodando**
2. **Banco de dados criado** (`suporte_dp`)
3. **Variáveis de ambiente configuradas** (arquivo `.env`)
4. **Dependências instaladas** (`npm install`)

## 🚀 Passo a Passo

### 1. Executar Migrations de Assinatura

Execute as migrations que criam as tabelas e campos necessários:

```bash
npm run migrate-subscription
```

Isso irá:
- ✅ Criar tabela `orders` (pedidos)
- ✅ Criar tabela `payments` (pagamentos)
- ✅ Adicionar campos de assinatura na tabela `users`:
  - `order_nsu` (UUID do pedido)
  - `status` (ativo/bloqueado)
  - `subscription_status` (ativa/inadimplente)
  - `subscription_expires_at` (data de expiração)

### 2. Verificar se o Admin Existe

```bash
npm run create-admin
```

Isso garante que você tenha um usuário admin:
- **Email:** `admin@suportedp.com`
- **Senha:** `admin123`

### 3. Iniciar o Servidor

```bash
npm start
# ou para desenvolvimento:
npm run dev
```

### 4. Testar o Painel Admin

#### 4.1 Acessar o Painel

1. Acesse: `http://localhost:3000/login`
2. Faça login com:
   - Email: `admin@suportedp.com`
   - Senha: `admin123`
3. Você será redirecionado para `/dashboard`

#### 4.2 Listar Usuários

1. Acesse: `http://localhost:3000/admin/usuarios`
2. Você verá uma tabela com as seguintes colunas:
   - **Usuário** (nome e badge admin)
   - **Email / WhatsApp**
   - **Status** (Ativo/Inativo/Bloqueado)
   - **Assinatura** (Ativa/Inadimplente + data de expiração)
   - **Último Pagamento** (valor, método, data)
   - **Próxima Renovação** (data)
   - **Ações** (ver detalhes, ativar/bloquear, resetar senha)

#### 4.3 Ver Detalhes do Usuário

1. Na lista de usuários, clique no ícone de **olho** (👁️) de qualquer usuário
2. Você verá:
   - **Seção de Assinatura** (se o usuário tiver):
     - Status da assinatura
     - Data de expiração
     - Order NSU
   - **Histórico de Pagamentos** (se houver):
     - Data do pagamento
     - Valor pago
     - Método de pagamento
     - Próxima renovação
     - Status do pagamento

## 🧪 Criar Dados de Teste

Para testar as funcionalidades, você pode criar dados de teste manualmente no banco:

### Opção 1: Via SQL direto

```sql
-- Conectar ao banco
psql -U postgres -d suporte_dp

-- Criar um pedido de exemplo
INSERT INTO orders (order_nsu, customer_name, customer_email, customer_phone, amount, status)
VALUES (
  gen_random_uuid(),
  'João da Silva',
  'joao@exemplo.com',
  '11999999999',
  99.90,
  'pending'
);

-- Criar um pagamento aprovado (copie o order_nsu do INSERT acima)
INSERT INTO payments (order_nsu, transaction_nsu, invoice_slug, amount, paid_amount, capture_method, status, paid_at, next_billing_date)
VALUES (
  'ORDER_NSU_AQUI', -- Cole o order_nsu do INSERT acima
  'TXN-' || gen_random_uuid()::text,
  'invoice-' || gen_random_uuid()::text,
  99.90,
  99.90,
  'credit_card',
  'paid',
  CURRENT_TIMESTAMP,
  CURRENT_DATE + INTERVAL '30 days'
);

-- Atualizar status do pedido
UPDATE orders SET status = 'paid' WHERE order_nsu = 'ORDER_NSU_AQUI';

-- Criar usuário vinculado ao pagamento
INSERT INTO users (nome, email, senha_hash, is_admin, order_nsu, status, subscription_status, subscription_expires_at)
VALUES (
  'João da Silva',
  'joao@exemplo.com',
  '$2b$10$rQ7vXlYKv3vJfN8zYxYxXuHxYxYxYxYxYxYxYxYxYxYxYxYxYxYx', -- Hash de 'senha123'
  false,
  'ORDER_NSU_AQUI', -- Cole o order_nsu
  'ativo',
  'ativa',
  CURRENT_DATE + INTERVAL '30 days'
);

-- Atualizar payment com user_id
UPDATE payments SET user_id = (SELECT id FROM users WHERE order_nsu = 'ORDER_NSU_AQUI') WHERE order_nsu = 'ORDER_NSU_AQUI';
```

### Opção 2: Usar o script de teste (futuro)

Um script automatizado pode ser criado para facilitar os testes.

## 🔍 Verificar Funcionalidades

### ✅ Listagem de Usuários

- [ ] A tabela mostra usuários com suas assinaturas
- [ ] Status da assinatura aparece corretamente (Ativa/Inadimplente)
- [ ] Último pagamento aparece (se houver)
- [ ] Próxima renovação aparece (se houver)

### ✅ Detalhes do Usuário

- [ ] Seção de assinatura aparece (se o usuário tiver)
- [ ] Histórico de pagamentos aparece (se houver)
- [ ] Todas as informações estão corretas

### ✅ Sistema de Assinatura

Para testar completamente, você precisaria:

1. **Simular um pagamento:**
   - Criar um pedido via `/adquirir`
   - Simular webhook de pagamento aprovado
   - Ou criar dados manualmente no banco (como mostrado acima)

2. **Testar cadastro:**
   - Acessar `/adquirir` e criar pedido
   - Com o `order_nsu`, simular pagamento
   - Tentar acessar `/register?order_nsu=XXXXX`
   - O cadastro deve funcionar apenas com pagamento aprovado

3. **Testar login:**
   - Fazer login com usuário com assinatura ativa (deve funcionar)
   - Fazer login com usuário com assinatura expirada (deve bloquear)
   - Fazer login com usuário inadimplente (deve bloquear)

4. **Testar bloqueio automático:**
   ```bash
   npm run check-subscriptions
   ```
   - Isso verifica usuários com assinatura expirada
   - Bloqueia automaticamente os inadimplentes

## 🐛 Troubleshooting

### Erro: "tabela não existe"

Execute as migrations:
```bash
npm run migrate-subscription
```

### Erro: "coluna não existe"

As migrations podem não ter sido executadas completamente. Verifique:
```sql
-- Verificar se campos existem
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('order_nsu', 'status', 'subscription_status', 'subscription_expires_at');
```

### Erro de conexão com banco

Verifique seu arquivo `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=sua_senha
```

## 📝 Notas

- Em desenvolvimento, você pode criar dados de teste manualmente
- O webhook do InfinitePay só funciona em produção (precisa de URL pública)
- Para testar localmente, crie dados manualmente no banco
- O script `check-subscriptions` pode ser executado manualmente ou configurado como cron job

