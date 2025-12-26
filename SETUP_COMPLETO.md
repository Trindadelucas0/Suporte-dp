# 🚀 Setup Completo - Suporte DP

## 📋 Passo a Passo

### 1️⃣ Criar o Banco de Dados PostgreSQL

**Opção A - Via psql (Recomendado):**
```bash
psql -U postgres
```

No prompt do PostgreSQL:
```sql
CREATE DATABASE suporte_dp;
\q
```

**Opção B - Via pgAdmin:**
1. Abra pgAdmin
2. Conecte ao servidor PostgreSQL
3. Clique direito em **Databases** → **Create** → **Database**
4. Nome: `suporte_dp`
5. Clique em **Save**

### 2️⃣ Criar Arquivo .env

Crie um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo:

```env
# ============================================
# CONFIGURAÇÕES DO SERVIDOR
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# CONFIGURAÇÕES DO BANCO DE DADOS POSTGRESQL
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=postgres

# ============================================
# CONFIGURAÇÕES DE SESSÃO
# ============================================
# IMPORTANTE: Altere este secret para uma string aleatória longa e segura
SESSION_SECRET=altere-este-secret-para-uma-string-aleatoria-longa-e-segura-em-producao

# ============================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ============================================
APP_NAME=Suporte DP
APP_URL=http://localhost:3000
```

⚠️ **IMPORTANTE:**
- Altere `DB_PASSWORD` para a senha do seu PostgreSQL
- Altere `SESSION_SECRET` para uma string aleatória (veja abaixo)

**Gerar SESSION_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3️⃣ Instalar Dependências

```bash
npm install
```

### 4️⃣ Iniciar o Servidor

```bash
npm start
```

✅ **As tabelas serão criadas automaticamente quando o servidor iniciar!**

Você verá no console:
```
🚀 Servidor rodando em http://localhost:3000
📊 Ambiente: development
✅ Conexão com PostgreSQL estabelecida
🔄 Verificando banco de dados...
📦 Criando tabelas...
✅ Tabelas criadas com sucesso!
✅ Dados iniciais inseridos!
```

### 5️⃣ Criar Usuário Administrador

Em outro terminal:
```bash
npm run create-admin
```

Isso criará:
- **Email**: `admin@suportedp.com`
- **Senha**: `admin123`

⚠️ **Altere a senha após o primeiro login!**

## 🎯 Pronto!

Acesse: `http://localhost:3000`

Faça login com:
- Email: `admin@suportedp.com`
- Senha: `admin123`

## 📝 Resumo do Que Foi Criado

### Scripts SQL
- ✅ `database/create-database.sql` - Cria apenas o banco
- ✅ `database/criar-banco-completo.sql` - Instruções completas
- ✅ `database/schema.sql` - Estrutura das tabelas (executado automaticamente)
- ✅ `database/seed.sql` - Dados iniciais (feriados)

### Scripts Node.js
- ✅ `scripts/auto-init-database.js` - Cria tabelas automaticamente
- ✅ `scripts/create-admin.js` - Cria usuário admin
- ✅ `scripts/init-database.js` - Inicialização manual (opcional)

### Configuração
- ✅ `.env` - Variáveis de ambiente (você precisa criar)
- ✅ `server.js` - Modificado para criar tabelas automaticamente

## 🔍 Verificar se Funcionou

### Verificar Tabelas Criadas
```bash
psql -U postgres -d suporte_dp -c "\dt"
```

### Verificar Usuários
```bash
psql -U postgres -d suporte_dp -c "SELECT nome, email FROM users;"
```

### Verificar Feriados
```bash
psql -U postgres -d suporte_dp -c "SELECT COUNT(*) FROM feriados;"
```

## ❓ Problemas Comuns

### Erro: "database does not exist"
**Solução**: Crie o banco primeiro (passo 1)

### Erro: "password authentication failed"
**Solução**: Verifique a senha no `.env`

### Erro: "relation already exists"
**Solução**: Normal, significa que as tabelas já existem. Pode ignorar.

### Tabelas não criaram automaticamente
**Solução**: 
1. Verifique logs do servidor
2. Verifique permissões do usuário PostgreSQL
3. Execute manualmente: `npm run init-db`

## ✅ Checklist Final

- [ ] Banco `suporte_dp` criado
- [ ] Arquivo `.env` criado e configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor iniciado (`npm start`)
- [ ] Tabelas criadas automaticamente (verificar logs)
- [ ] Admin criado (`npm run create-admin`)
- [ ] Login funcionando

---

**Tudo pronto! 🎉**

