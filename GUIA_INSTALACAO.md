# 🚀 Guia de Instalação - Suporte DP

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (v14 ou superior) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 ou superior) - [Download](https://www.postgresql.org/download/)
- **npm** (vem com Node.js) ou **yarn**
- **Git** (opcional, para clonar repositório)

## Passo a Passo

### 1. Preparar o Ambiente

#### Windows
```bash
# Verificar instalações
node --version
npm --version
psql --version
```

#### Linux/Mac
```bash
# Verificar instalações
node --version
npm --version
psql --version
```

### 2. Criar Banco de Dados PostgreSQL

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco de dados
CREATE DATABASE suporte_dp;

# Sair
\q
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
# Use um editor de texto ou:
nano .env
# ou
notepad .env  # Windows
```

**Conteúdo do `.env`**:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

SESSION_SECRET=seu_secret_super_seguro_aqui_mude_em_producao

APP_NAME=Suporte DP
APP_URL=http://localhost:3000
```

⚠️ **IMPORTANTE**: 
- Altere `DB_PASSWORD` para a senha do seu PostgreSQL
- Altere `SESSION_SECRET` para uma string aleatória longa e segura
- Em produção, use variáveis de ambiente do servidor, não arquivo `.env`

### 4. Instalar Dependências

```bash
npm install
```

Isso instalará todas as dependências listadas no `package.json`:
- express
- ejs
- pg
- bcrypt
- express-session
- connect-pg-simple
- dotenv
- pdf-lib
- express-validator
- moment

### 5. Inicializar Banco de Dados

```bash
# Criar tabelas e dados iniciais
npm run init-db
```

Este comando:
- Cria todas as tabelas necessárias
- Insere feriados nacionais (2024-2025)
- Configura triggers e índices

### 6. Criar Usuário Administrador

```bash
# Criar usuário admin
npm run create-admin
```

Isso criará o usuário:
- **Email**: `admin@suportedp.com`
- **Senha**: `admin123`

⚠️ **ALTERE A SENHA IMEDIATAMENTE APÓS O PRIMEIRO LOGIN!**

### 7. Iniciar o Servidor

#### Modo Desenvolvimento (com auto-reload)
```bash
npm run dev
```

#### Modo Produção
```bash
npm start
```

### 8. Acessar o Sistema

Abra o navegador em:
```
http://localhost:3000
```

Você será redirecionado para `/login`.

## Verificação

### Testar Instalação

1. **Login**: Use as credenciais do admin
2. **Dashboard**: Deve carregar sem erros
3. **Calculadora INSS**: Teste um cálculo
4. **Calendário**: Verifique se os feriados aparecem

### Verificar Banco de Dados

```bash
psql -U postgres -d suporte_dp

# Listar tabelas
\dt

# Verificar usuários
SELECT nome, email, is_admin FROM users;

# Sair
\q
```

## Solução de Problemas

### Erro: "Cannot find module"

```bash
# Reinstalar dependências
rm -rf node_modules
npm install
```

### Erro: "Connection refused" (PostgreSQL)

1. Verifique se o PostgreSQL está rodando:
   ```bash
   # Windows
   services.msc  # Procurar por PostgreSQL
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verifique credenciais no `.env`

### Erro: "relation does not exist"

```bash
# Reexecutar inicialização do banco
npm run init-db
```

### Porta 3000 já em uso

Altere a porta no `.env`:
```env
PORT=3001
```

## Estrutura de Diretórios Criada

Após a instalação, você terá:

```
suporte-dp/
├── node_modules/        # Dependências (criado pelo npm install)
├── config/              # Configurações
├── controllers/         # Controllers MVC
├── database/            # Scripts SQL
├── middleware/          # Middlewares
├── models/              # Models MVC
├── routes/              # Rotas
├── scripts/             # Scripts auxiliares
├── services/            # Lógica de negócio
├── views/               # Templates EJS
├── .env                 # Variáveis de ambiente (criado por você)
├── package.json         # Dependências
└── server.js            # Servidor principal
```

## Próximos Passos

1. ✅ Alterar senha do admin
2. ✅ Criar sua conta de usuário
3. ✅ Explorar as calculadoras
4. ✅ Testar geração de PDF
5. ✅ Configurar backup do banco

## Produção

### Checklist de Deploy

- [ ] `NODE_ENV=production` no `.env`
- [ ] `SESSION_SECRET` alterado para valor seguro
- [ ] Senha do admin alterada
- [ ] HTTPS configurado
- [ ] Backup automático do banco
- [ ] Logs configurados
- [ ] Firewall configurado
- [ ] Process manager (PM2) configurado

### PM2 (Process Manager)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name suporte-dp

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

### Nginx (Proxy Reverso)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

**Precisa de ajuda?** Consulte a documentação técnica ou abra uma issue.

