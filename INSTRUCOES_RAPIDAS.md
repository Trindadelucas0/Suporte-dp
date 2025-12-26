# ⚡ Instruções Rápidas - Suporte DP

## 🚀 Setup Completo em 5 Passos

### 1️⃣ Criar o Banco de Dados

**Opção A - Via psql:**
```bash
psql -U postgres
CREATE DATABASE suporte_dp;
\q
```

**Opção B - Via pgAdmin:**
- Abra pgAdmin
- Clique direito em Databases → Create → Database
- Nome: `suporte_dp`
- Save

### 2️⃣ Configurar .env

O arquivo `.env` já foi criado! Apenas ajuste:

```env
DB_PASSWORD=sua_senha_do_postgresql
SESSION_SECRET=uma_string_aleatoria_longa_e_segura
```

💡 **Para gerar SESSION_SECRET seguro:**
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

✅ **As tabelas serão criadas automaticamente!**

Você verá no console:
```
🔄 Verificando banco de dados...
📦 Criando tabelas...
✅ Tabelas criadas com sucesso!
✅ Dados iniciais inseridos!
```

### 5️⃣ Criar Usuário Admin

```bash
npm run create-admin
```

## 🎯 Pronto!

Acesse: `http://localhost:3000`

- **Login**: `admin@suportedp.com`
- **Senha**: `admin123`

⚠️ **Altere a senha após o primeiro login!**

## 📝 Resumo

1. ✅ Banco criado (`suporte_dp`)
2. ✅ `.env` configurado
3. ✅ Dependências instaladas (`npm install`)
4. ✅ Servidor iniciado (`npm start`) → **Tabelas criadas automaticamente**
5. ✅ Admin criado (`npm run create-admin`)

## ❓ Problemas?

**Erro de conexão?**
- Verifique se PostgreSQL está rodando
- Confira senha no `.env`

**Tabelas não criaram?**
- Verifique logs do servidor
- Confira permissões do usuário PostgreSQL

**Erro ao iniciar?**
- Verifique se todas as dependências foram instaladas
- Confira se o banco `suporte_dp` existe

---

**Tudo pronto! 🎉**

