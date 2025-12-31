# 🚀 Guia de Deploy no Render

Este guia explica como configurar e fazer deploy da aplicação no Render, incluindo a configuração das variáveis de ambiente necessárias.

## 📋 Pré-requisitos

1. Conta no [Render.com](https://render.com)
2. Banco de dados PostgreSQL criado no Render
3. Repositório Git (GitHub, GitLab, etc.)

## 🔧 Configuração das Variáveis de Ambiente no Render

### Passo 1: Acessar as Configurações do Serviço

1. No painel do Render, acesse seu **Web Service**
2. Vá em **Environment** (ou **Environment Variables**)
3. Clique em **Add Environment Variable**

### Passo 2: Configurar Variáveis Obrigatórias

Adicione as seguintes variáveis de ambiente:

#### ✅ Variáveis Obrigatórias

| Variável | Descrição | Como Obter |
|----------|-----------|------------|
| `SESSION_SECRET` | **OBRIGATÓRIO** - Chave secreta para sessões | Veja instruções abaixo |
| `DB_HOST` | Host do PostgreSQL | Painel do PostgreSQL no Render |
| `DB_PORT` | Porta do PostgreSQL | Geralmente `5432` |
| `DB_NAME` | Nome do banco de dados | Nome que você definiu |
| `DB_USER` | Usuário do banco | Painel do PostgreSQL no Render |
| `DB_PASSWORD` | Senha do banco | Painel do PostgreSQL no Render |
| `NODE_ENV` | Ambiente da aplicação | Defina como `production` |

#### 🔐 Gerando o SESSION_SECRET

**IMPORTANTE**: O `SESSION_SECRET` é obrigatório e deve ser uma string aleatória e segura.

Para gerar um secret seguro, execute localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e cole no campo `SESSION_SECRET` no Render.

**Exemplo de valor gerado:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

#### 📝 Variáveis Opcionais

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `PORT` | `3000` | Porta do servidor (Render define automaticamente) |
| `APP_NAME` | `Suporte DP` | Nome da aplicação |
| `APP_URL` | - | URL completa da aplicação (ex: `https://seu-app.onrender.com`) |

### Passo 3: Exemplo de Configuração Completa

No painel do Render, você deve ter algo assim:

```
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
NODE_ENV=production
DB_HOST=dpg-xxxxx-a.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=suporte_dp_xxxx
DB_USER=suporte_dp_user
DB_PASSWORD=senha_segura_aqui
APP_NAME=Suporte DP
APP_URL=https://seu-app.onrender.com
```

## 🗄️ Configuração do Banco de Dados PostgreSQL

### Criar Banco no Render

1. No painel do Render, clique em **New +** → **PostgreSQL**
2. Configure:
   - **Name**: Nome do seu banco
   - **Database**: Nome do banco (ex: `suporte_dp`)
   - **User**: Usuário (será gerado automaticamente)
   - **Region**: Escolha a região mais próxima
   - **PostgreSQL Version**: Use a versão mais recente
3. Clique em **Create Database**

### Obter Credenciais

Após criar o banco:

1. Acesse o painel do PostgreSQL
2. Vá em **Connections**
3. Copie as informações:
   - **Hostname** → Use em `DB_HOST`
   - **Port** → Use em `DB_PORT` (geralmente `5432`)
   - **Database** → Use em `DB_NAME`
   - **Username** → Use em `DB_USER`
   - **Password** → Use em `DB_PASSWORD`

## 🚀 Deploy da Aplicação

### Passo 1: Criar Web Service

1. No painel do Render, clique em **New +** → **Web Service**
2. Conecte seu repositório Git
3. Configure:
   - **Name**: Nome do serviço
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Escolha o plano (Free ou Paid)

### Passo 2: Configurar Variáveis de Ambiente

Siga o **Passo 2** acima para adicionar todas as variáveis necessárias.

### Passo 3: Deploy

1. Clique em **Create Web Service**
2. O Render iniciará o build automaticamente
3. Aguarde o deploy completar

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. **Logs do Servidor**: 
   - Deve mostrar: `✅ Conexão com PostgreSQL estabelecida`
   - Não deve mostrar: `❌ ERRO CRÍTICO: SESSION_SECRET não configurado`

2. **Aplicação Funcionando**:
   - Acesse a URL fornecida pelo Render
   - Deve carregar a página inicial

3. **Banco de Dados**:
   - As tabelas serão criadas automaticamente no primeiro acesso
   - Verifique no painel do PostgreSQL

## 🔍 Solução de Problemas

### Erro: "SESSION_SECRET não configurado"

**Causa**: Variável `SESSION_SECRET` não foi configurada no Render.

**Solução**:
1. Acesse **Environment** no painel do Render
2. Adicione a variável `SESSION_SECRET` com um valor gerado (veja instruções acima)
3. Faça um novo deploy

### Erro: "Erro ao conectar com PostgreSQL"

**Causa**: Credenciais do banco incorretas ou banco não acessível.

**Solução**:
1. Verifique se todas as variáveis do banco estão corretas:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
2. Verifique se o banco PostgreSQL está ativo no Render
3. Verifique se o banco permite conexões externas (Render faz isso automaticamente)

### Erro: "Nenhuma porta aberta detectada"

**Causa**: A aplicação não está escutando na porta correta.

**Solução**: 
- O código já está configurado para usar `process.env.PORT` que o Render define automaticamente
- Não é necessário configurar manualmente a porta

## 📚 Recursos Adicionais

- [Documentação do Render](https://render.com/docs)
- [Configuração de Variáveis de Ambiente no Render](https://render.com/docs/environment-variables)
- [PostgreSQL no Render](https://render.com/docs/databases)

## 🔒 Segurança

⚠️ **IMPORTANTE**:

- **NUNCA** commite o arquivo `.env` no Git
- **NUNCA** compartilhe o `SESSION_SECRET` publicamente
- Use valores diferentes de `SESSION_SECRET` para desenvolvimento e produção
- Mantenha as senhas do banco de dados seguras

## 📝 Checklist de Deploy

Antes de fazer deploy, certifique-se de:

- [ ] Banco PostgreSQL criado no Render
- [ ] Variável `SESSION_SECRET` configurada (gerada com comando seguro)
- [ ] Variáveis do banco (`DB_*`) configuradas corretamente
- [ ] `NODE_ENV` definido como `production`
- [ ] Repositório Git conectado ao Render
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server.js`
- [ ] Testado localmente antes do deploy

---

**Pronto!** Sua aplicação deve estar funcionando no Render. 🎉

