# 🎯 Sistema de Ativação de Usuário Via Venda

## 📋 Visão Geral

Este sistema implementa um fluxo completo de ativação de usuários através de vendas realizadas em plataformas como **Kiwify**, **Hotmart** e **Kirvano**.

### ⚠️ Princípios Fundamentais

1. **NÃO mistura login com venda** - O sistema de autenticação é completamente separado
2. **NÃO cria usuário automaticamente** - Usuário só é criado após preencher formulário de cadastro
3. **NÃO acopla venda ao sistema principal** - Webhooks são processados de forma isolada

---

## 🏗️ Arquitetura

### Separação de Responsabilidades

```
┌─────────────────────────────────────────────────────────┐
│                    WEBHOOK (Entrada)                    │
│  - Recebe eventos de pagamento aprovado                │
│  - Valida origem e assinatura                          │
│  - Extrai dados da compra                             │
│  - Gera link único de cadastro                         │
│  - Envia email com link                                │
│  - NÃO cria usuário                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              TABELA: activation_links                   │
│  - Armazena links de cadastro                          │
│  - Token único e seguro                                │
│  - Data de expiração                                   │
│  - Status (pending/used/expired)                       │
│  - Referência da venda                                 │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              SISTEMA PRINCIPAL (Saída)                  │
│  - Valida token do link                                │
│  - Exibe formulário de cadastro                        │
│  - Cria usuário no banco principal                     │
│  - Marca link como usado                               │
│  - Realiza login automático                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo Completo

### 1️⃣ Recebimento do Webhook

Quando uma venda é aprovada:

1. Plataforma envia webhook para `/webhook/{plataforma}`
2. Sistema valida assinatura do webhook
3. Extrai dados padronizados da venda
4. Verifica se usuário já existe
5. Verifica se já existe link pendente

### 2️⃣ Geração do Link

1. Gera token criptograficamente seguro (64 caracteres)
2. Cria registro na tabela `activation_links`
3. Define expiração (padrão: 7 dias)
4. Armazena dados completos da venda (JSON)

### 3️⃣ Envio de Email

1. Gera URL completa do link: `{APP_URL}/ativar/{token}`
2. Envia email HTML com:
   - Nome do cliente
   - Link de cadastro
   - Aviso de expiração
3. Template responsivo e profissional

### 4️⃣ Cadastro do Usuário

1. Usuário acessa link `/ativar/{token}`
2. Sistema valida token:
   - Verifica se existe
   - Verifica se não foi usado
   - Verifica se não expirou
3. Exibe formulário de cadastro pré-preenchido com email
4. Usuário preenche nome e senha
5. Sistema cria usuário no banco principal
6. Marca link como usado
7. Realiza login automático
8. Redireciona para dashboard

---

## 🗄️ Modelagem de Dados

### Tabela: `activation_links`

```sql
CREATE TABLE activation_links (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    nome_cliente VARCHAR(255),
    plataforma VARCHAR(50) NOT NULL,
    venda_id VARCHAR(255),
    venda_data JSONB,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos importantes:**
- `token`: Token único de 64 caracteres (hex)
- `status`: `pending` | `used` | `expired`
- `venda_data`: Dados completos da venda em JSON (auditoria)
- `expires_at`: Data de expiração (padrão: 7 dias)

---

## 🔐 Segurança

### Validação de Webhook

Cada plataforma usa HMAC SHA256 para assinar webhooks:

- **Kiwify**: Header `X-Kiwify-Signature`
- **Hotmart**: Header `X-Hotmart-Hmac-Sha256`
- **Kirvano**: Header `X-Kirvano-Signature`

### Token de Ativação

- Gerado com `crypto.randomBytes(32)` (64 caracteres hex)
- Único no banco de dados
- Expira automaticamente após 7 dias
- Uso único (marcado como `used` após cadastro)

### Proteções Adicionais

- Rate limiting nas rotas de webhook
- Validação de email antes de criar link
- Verificação de duplicidade de usuário
- Links expirados são automaticamente invalidados

---

## 📧 Configuração de Email

### Variáveis de Ambiente

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=noreply@seudominio.com
```

### Gmail (Senha de App)

1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha de app
3. Use essa senha no `SMTP_PASS`

### Outros Provedores

- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: Consulte documentação AWS

---

## 🔌 Configuração de Webhooks

### Kiwify

1. Acesse: Configurações → Webhooks
2. URL: `https://seu-app.com/webhook/kiwify`
3. Eventos: `order.paid`, `payment.approved`
4. Copie o secret e configure: `KIWIFY_WEBHOOK_SECRET`

### Hotmart

1. Acesse: Configurações → Webhooks
2. URL: `https://seu-app.com/webhook/hotmart`
3. Eventos: `PURCHASE_APPROVED`
4. Copie o secret e configure: `HOTMART_WEBHOOK_SECRET`

### Kirvano

1. Acesse: Configurações → Webhooks
2. URL: `https://seu-app.com/webhook/kirvano`
3. Eventos: `sale.approved`
4. Copie o secret e configure: `KIRVANO_WEBHOOK_SECRET`

---

## 🚀 Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Executar Migration

```bash
# Via script
node scripts/run-migration.js 005_create_activation_links.sql

# Ou manualmente no PostgreSQL
psql -U seu_usuario -d seu_banco -f database/migrations/005_create_activation_links.sql
```

### 3. Configurar Variáveis de Ambiente

Copie `env.example` para `.env` e configure:

```env
# Webhooks
KIWIFY_WEBHOOK_SECRET=seu-secret
HOTMART_WEBHOOK_SECRET=seu-secret
KIRVANO_WEBHOOK_SECRET=seu-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=noreply@seudominio.com

# App
APP_URL=https://seu-app.com
```

### 4. Testar

```bash
# Iniciar servidor
npm run dev

# Testar webhook (exemplo Kiwify)
curl -X POST http://localhost:3000/webhook/kiwify \
  -H "Content-Type: application/json" \
  -H "X-Kiwify-Signature: assinatura" \
  -d '{"event":"order.paid","data":{...}}'
```

---

## 📊 Monitoramento

### Logs Importantes

- ✅ `Link de ativação criado para: {email}`
- ⚠️ `Usuário já existe: {email}`
- ⚠️ `Link pendente já existe para: {email}`
- ❌ `Erro ao enviar email: {erro}`
- ❌ `Webhook {plataforma}: Assinatura inválida`

### Queries Úteis

```sql
-- Links pendentes
SELECT * FROM activation_links WHERE status = 'pending' AND expires_at > NOW();

-- Links expirados
SELECT * FROM activation_links WHERE status = 'expired';

-- Links por plataforma
SELECT plataforma, COUNT(*) FROM activation_links GROUP BY plataforma;

-- Taxa de conversão
SELECT 
  COUNT(CASE WHEN status = 'used' THEN 1 END) * 100.0 / COUNT(*) as taxa_conversao
FROM activation_links;
```

---

## 🔧 Manutenção

### Limpeza de Links Expirados

Execute periodicamente (ex: via cron):

```javascript
const ActivationLink = require('./models/ActivationLink');
await ActivationLink.cleanupExpired();
```

### Reenvio de Email

Se um email não foi enviado, você pode reenviar manualmente consultando a tabela `activation_links` e gerando um novo link.

---

## 🐛 Troubleshooting

### Email não está sendo enviado

1. Verifique logs do servidor
2. Teste conexão SMTP: `EmailService.testConnection()`
3. Verifique variáveis de ambiente
4. Gmail: Use senha de app, não senha normal

### Webhook retorna 401

1. Verifique se o secret está correto
2. Confirme que o header de assinatura está sendo enviado
3. Verifique se o body raw está sendo capturado corretamente

### Link expira muito rápido

Ajuste o parâmetro `expiresInHours` em `ActivationLink.create()` (padrão: 168 horas = 7 dias)

### Usuário não consegue acessar link

1. Verifique se o token está correto
2. Verifique se o link não foi usado
3. Verifique se o link não expirou
4. Verifique logs para erros específicos

---

## 📝 Notas Importantes

1. **Não duplicar usuários**: Sistema verifica se email já existe antes de criar link
2. **Links são únicos**: Cada venda gera um novo link, mas reutiliza se já existe pendente
3. **Auditoria completa**: Todos os dados da venda são armazenados em `venda_data` (JSONB)
4. **Escalabilidade**: Sistema foi projetado para processar múltiplas vendas simultaneamente
5. **Segurança**: Validação de assinatura impede webhooks falsos

---

## 🎓 Boas Práticas

1. ✅ Sempre valide webhooks antes de processar
2. ✅ Use HTTPS em produção
3. ✅ Configure rate limiting nas rotas de webhook
4. ✅ Monitore logs de erro
5. ✅ Faça backup regular da tabela `activation_links`
6. ✅ Teste webhooks em ambiente de desenvolvimento primeiro
7. ✅ Documente mudanças nos formatos de webhook das plataformas

---

## 📚 Referências

- [Documentação Kiwify Webhooks](https://docs.kiwify.com.br/webhooks)
- [Documentação Hotmart Webhooks](https://developers.hotmart.com/docs/pt-BR/webhooks/)
- [Documentação Kirvano Webhooks](https://docs.kirvano.com/webhooks)
- [Nodemailer Documentation](https://nodemailer.com/about/)

