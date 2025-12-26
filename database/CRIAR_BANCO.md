# 📊 Como Criar o Banco de Dados

## Opção 1: Via psql (Linha de Comando)

### Windows
```bash
# Abrir prompt de comando ou PowerShell
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco de dados
CREATE DATABASE suporte_dp;

# Sair
\q
```

### Linux/Mac
```bash
# Conectar ao PostgreSQL
sudo -u postgres psql

# Criar banco de dados
CREATE DATABASE suporte_dp;

# Sair
\q
```

## Opção 2: Via pgAdmin (Interface Gráfica)

1. Abra o **pgAdmin**
2. Conecte-se ao servidor PostgreSQL
3. Clique com botão direito em **Databases**
4. Selecione **Create** → **Database**
5. Nome: `suporte_dp`
6. Clique em **Save**

## Opção 3: Usando o Script SQL

```bash
# Execute o script
psql -U postgres -f database/create-database.sql
```

## ⚠️ IMPORTANTE

Após criar o banco:

1. **Configure o arquivo `.env`** com suas credenciais:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=suporte_dp
   DB_USER=postgres
   DB_PASSWORD=sua_senha_aqui
   ```

2. **Inicie o servidor**:
   ```bash
   npm start
   ```

3. **As tabelas serão criadas automaticamente** quando o servidor iniciar!

4. **Crie o usuário admin**:
   ```bash
   npm run create-admin
   ```

## ✅ Verificação

Para verificar se o banco foi criado:

```bash
psql -U postgres -d suporte_dp -c "\dt"
```

Isso listará todas as tabelas criadas.

