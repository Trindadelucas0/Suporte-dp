# 📝 Como Criar o Arquivo .env

## Opção 1: Script Automático (Recomendado)

Execute o comando:
```bash
npm run create-env
```

Isso criará o arquivo `.env` automaticamente com todas as configurações.

## Opção 2: Criar Manualmente

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
# Altere estas configurações conforme seu ambiente
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=postgres

# ============================================
# CONFIGURAÇÕES DE SESSÃO
# ============================================
# SESSION_SECRET gerado automaticamente - altere em produção
SESSION_SECRET=bb9f262dda1f1eeb851c3924174acb8bb345711eedf43e52f346910920abb70d

# ============================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ============================================
APP_NAME=Suporte DP
APP_URL=http://localhost:3000
```

## ⚠️ IMPORTANTE: Ajustar Configurações

Após criar o arquivo, **ALTERE**:

1. **DB_PASSWORD**: Coloque a senha do seu PostgreSQL
   ```env
   DB_PASSWORD=sua_senha_aqui
   ```

2. **SESSION_SECRET**: Em produção, gere um novo secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## 📋 Explicação das Variáveis

- **PORT**: Porta do servidor (padrão: 3000)
- **NODE_ENV**: Ambiente (development/production)
- **DB_HOST**: Host do PostgreSQL (geralmente localhost)
- **DB_PORT**: Porta do PostgreSQL (padrão: 5432)
- **DB_NAME**: Nome do banco de dados (suporte_dp)
- **DB_USER**: Usuário do PostgreSQL (geralmente postgres)
- **DB_PASSWORD**: **SENHA DO POSTGRESQL** ⚠️
- **SESSION_SECRET**: Chave secreta para sessões (gerada automaticamente)
- **APP_NAME**: Nome da aplicação
- **APP_URL**: URL da aplicação

## ✅ Verificar se Funcionou

Após criar o `.env`, teste:
```bash
npm start
```

Se conectar ao banco, está tudo certo! 🎉

