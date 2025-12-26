# 🔧 Solução para Erro de Criação de Tabelas

## Problema

Ao iniciar o servidor, as tabelas não estão sendo criadas corretamente devido a problemas no parsing do SQL.

## Soluções

### Solução 1: Executar Schema Manualmente (Recomendado)

Execute o schema.sql diretamente no PostgreSQL:

```bash
# Windows (PowerShell ou CMD)
psql -U postgres -d suporte_dp -f database\schema.sql

# Linux/Mac
psql -U postgres -d suporte_dp -f database/schema.sql
```

Ou via pgAdmin:
1. Abra pgAdmin
2. Conecte ao servidor
3. Clique direito no banco `suporte_dp`
4. Selecione **Query Tool**
5. Abra o arquivo `database/schema.sql`
6. Execute (F5)

### Solução 2: Usar Script de Inicialização Manual

```bash
npm run init-db
```

### Solução 3: Criar Tabelas Uma a Uma

Se as soluções acima não funcionarem, você pode executar os comandos SQL diretamente:

```sql
-- Conecte ao banco suporte_dp
\c suporte_dp

-- Execute o conteúdo do arquivo database/schema.sql
-- Copie e cole o conteúdo completo no psql ou pgAdmin
```

## Verificar se Funcionou

Após executar o schema, verifique:

```sql
-- Listar todas as tabelas
\dt

-- Verificar se users existe
SELECT * FROM users LIMIT 1;

-- Verificar se feriados existe
SELECT COUNT(*) FROM feriados;
```

## Após Criar as Tabelas

1. **Inserir dados iniciais (feriados):**
   ```bash
   psql -U postgres -d suporte_dp -f database/seed.sql
   ```

2. **Criar usuário admin:**
   ```bash
   npm run create-admin
   ```

3. **Reiniciar servidor:**
   ```bash
   npm start
   ```

## Nota

O servidor continuará funcionando mesmo se as tabelas não forem criadas automaticamente. Você pode criar as tabelas manualmente usando uma das soluções acima.

