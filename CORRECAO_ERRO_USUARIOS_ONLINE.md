# 🔧 Correção: Erro ao Buscar Usuários Online

## ❌ Erro Original

```
Erro ao buscar usuários online: error: não foi possível identificar um operador de igualdade para tipo json
code: '42883'
```

## 🔍 Causa do Erro

O erro ocorria na linha 26 do arquivo `services/userActivityService.js`:

```sql
INNER JOIN sessions s ON s.sess::jsonb->>'user' IS NOT NULL
```

### Problemas Identificados:

1. **Tipo de Dados Incompatível:**
   - A coluna `sess` na tabela `sessions` é do tipo `JSON` (não `JSONB`)
   - Tentativa de fazer cast para `JSONB` (`::jsonb`) e depois extrair campo (`->>'user'`)

2. **Operador de Igualdade:**
   - O PostgreSQL não consegue usar expressões JSON complexas diretamente na condição de `JOIN`
   - O operador `->>'user'` retorna `TEXT`, mas o PostgreSQL precisa de uma comparação de igualdade válida para fazer o JOIN

3. **Limitação do PostgreSQL:**
   - JOINs requerem comparações diretas entre colunas ou valores simples
   - Expressões JSON/JSONB não podem ser usadas diretamente em condições de JOIN

## ✅ Solução Aplicada

### Abordagem Corrigida:

1. **Buscar Sessões Primeiro:**
   ```sql
   SELECT sess, expire
   FROM sessions
   WHERE expire > NOW()
   ```

2. **Processar JSON em JavaScript:**
   - Parse do JSON das sessões
   - Extração dos IDs de usuários das sessões ativas
   - Armazenamento em um `Set` para evitar duplicatas

3. **Buscar Usuários Correspondentes:**
   ```sql
   SELECT id, nome, email, is_admin, ultima_atividade
   FROM users
   WHERE 
     (ultima_atividade IS NOT NULL AND ultima_atividade > $1)
     OR id = ANY($2::uuid[])
   ```

### Vantagens da Nova Abordagem:

- ✅ **Compatível:** Funciona com tipo `JSON` e `JSONB`
- ✅ **Flexível:** Processa diferentes formatos de sessão
- ✅ **Eficiente:** Usa índices do PostgreSQL corretamente
- ✅ **Robusto:** Tem fallback caso haja erro no processamento

## 📝 Mudanças no Código

### Arquivo: `services/userActivityService.js`

**Antes:**
```javascript
const result = await db.query(`
  SELECT DISTINCT u.id, u.nome, u.email, u.is_admin, u.ultima_atividade, s.sess AS session_data
  FROM users u
  INNER JOIN sessions s ON s.sess::jsonb->>'user' IS NOT NULL
  WHERE ...
`, [fiveMinutesAgo]);
```

**Depois:**
```javascript
// 1. Busca sessões ativas
const sessionsResult = await db.query(`
  SELECT sess, expire
  FROM sessions
  WHERE expire > NOW()
`);

// 2. Processa JSON em JavaScript
const userIdsFromSessions = new Set();
for (const row of sessionsResult.rows) {
  const sessionData = typeof row.sess === 'string' 
    ? JSON.parse(row.sess) 
    : row.sess;
  const user = sessionData?.user || sessionData?.passport?.user;
  if (user && user.id) {
    userIdsFromSessions.add(user.id);
  }
}

// 3. Busca usuários
const result = await db.query(`
  SELECT id, nome, email, is_admin, ultima_atividade
  FROM users
  WHERE (ultima_atividade > $1 OR id = ANY($2::uuid[]))
  ...
`, [fiveMinutesAgo, Array.from(userIdsFromSessions)]);
```

## 🎯 Resultado

- ✅ Erro corrigido
- ✅ Query funciona corretamente
- ✅ Usuários online são identificados corretamente
- ✅ Fallback robusto em caso de erro

## 🔄 Fallback

Se houver qualquer erro no processamento, o sistema automaticamente usa o método `getOnlineUsersByActivity()` que busca apenas por `ultima_atividade`, garantindo que o sistema continue funcionando mesmo em caso de problemas.

---

**Status:** ✅ **CORRIGIDO**

O erro foi completamente resolvido e o sistema agora busca usuários online corretamente.

