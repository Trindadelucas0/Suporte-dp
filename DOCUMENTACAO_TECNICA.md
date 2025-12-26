# 📘 Documentação Técnica - Suporte DP

## 🏗 Arquitetura do Sistema

### Padrão MVC (Model-View-Controller)

O sistema segue rigorosamente o padrão MVC para organização e manutenibilidade:

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────┐
│   Routes    │ ← Definição de rotas e middlewares
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │ ← Lógica de controle e validação
└──────┬──────┘
       │
       ├──────────┐
       ▼          ▼
┌──────────┐  ┌──────────┐
│ Services │  │  Models  │ ← Lógica de negócio e acesso a dados
└─────┬────┘  └─────┬─────┘
      │             │
      └──────┬──────┘
             ▼
      ┌─────────────┐
      │  PostgreSQL │
      └─────────────┘
             │
             ▼
      ┌─────────────┐
      │    Views    │ ← Templates EJS renderizados
      └─────────────┘
```

### Fluxo de Requisição

1. **Cliente** faz requisição HTTP
2. **Routes** recebe e valida rota
3. **Middleware** (auth) verifica autenticação
4. **Controller** processa requisição
5. **Service** executa lógica de negócio
6. **Model** acessa banco de dados
7. **Controller** renderiza **View** com dados
8. **Cliente** recebe HTML renderizado

## 📊 Modelagem do Banco de Dados

### Diagrama de Relacionamentos

```
users (1) ──< (N) calculos_inss
users (1) ──< (N) calculos_irrf
users (1) ──< (N) calculos_fgts
users (1) ──< (N) calculos_avos
users (1) ──< (N) calculos_periculosidade
users (1) ──< (N) calculos_custo
users (1) ──< (N) checklists
users (1) ──< (N) calendario_anotacoes
users (1) ──< (N) notificacoes

checklists (1) ──< (N) checklist_itens
```

### Tabelas Principais

#### `users`
- **id**: UUID (PK)
- **nome**: VARCHAR(255)
- **email**: VARCHAR(255) UNIQUE
- **senha_hash**: VARCHAR(255) - bcrypt
- **is_admin**: BOOLEAN
- **created_at**: TIMESTAMP
- **updated_at**: TIMESTAMP

#### `calculos_inss`
- **id**: UUID (PK)
- **user_id**: UUID (FK → users)
- **salario_bruto**: DECIMAL(10,2)
- **pro_labore**: BOOLEAN
- **valor_inss**: DECIMAL(10,2)
- **memoria_calculo**: JSONB
- **created_at**: TIMESTAMP

#### `feriados`
- **id**: UUID (PK)
- **data**: DATE UNIQUE
- **nome**: VARCHAR(255)
- **tipo**: VARCHAR(50) - nacional/estadual/municipal
- **observacao**: TEXT

### Índices Estratégicos

```sql
-- Busca rápida por email
CREATE INDEX idx_users_email ON users(email);

-- Histórico de cálculos por usuário
CREATE INDEX idx_calculos_inss_user ON calculos_inss(user_id, created_at DESC);

-- Busca de feriados por data
CREATE INDEX idx_feriados_data ON feriados(data);

-- Notificações não lidas
CREATE INDEX idx_notificacoes_user_lida ON notificacoes(user_id, lida, created_at DESC);
```

## 🔐 Segurança

### Autenticação

1. **Senhas**: Criptografadas com bcrypt (10 rounds)
   ```javascript
   const hash = await bcrypt.hash(senha, 10);
   const isValid = await bcrypt.compare(senha, hash);
   ```

2. **Sessões**: Armazenadas no PostgreSQL
   - Cookie: httpOnly, secure (produção)
   - Expiração: 30 dias
   - Tabela: `sessions` (connect-pg-simple)

3. **Proteção de Rotas**:
   ```javascript
   // Middleware de autenticação
   function requireAuth(req, res, next) {
     if (req.session && req.session.user) {
       return next();
     }
     res.redirect('/login');
   }
   ```

### Validação

- **express-validator**: Validação de formulários
- **SQL Injection**: Proteção com parâmetros preparados (pg)
- **XSS**: EJS escapa automaticamente variáveis

## 🧮 Lógica de Cálculos

### INSS Progressivo

**Algoritmo**:
```javascript
1. Percorrer faixas em ordem crescente
2. Para cada faixa:
   - Calcular base da faixa (limite - limite anterior)
   - Aplicar alíquota apenas sobre a parte correspondente
   - Acumular valor
3. Limitar ao teto previdenciário se necessário
```

**Exemplo**:
```
Salário: R$ 3.000,00

Faixa 1: R$ 1.412,00 × 7,5% = R$ 105,90
Faixa 2: (R$ 2.666,68 - R$ 1.412,00) × 9% = R$ 112,92
Faixa 3: (R$ 3.000,00 - R$ 2.666,68) × 12% = R$ 40,00

Total: R$ 258,82
```

### IRRF

**Fórmula**:
```
Base IR = Salário Bruto - INSS - (Dependentes × 189,59) - Pensão
IRRF = (Base × Alíquota) - Dedução
```

**Tabela Progressiva 2024**:
- Até R$ 1.903,98: Isento
- Até R$ 2.826,65: 7,5% - R$ 142,80
- Até R$ 3.751,05: 15% - R$ 354,80
- Até R$ 4.664,68: 22,5% - R$ 636,13
- Acima: 27,5% - R$ 869,36

### FGTS

**Tipos**:
- **CLT Geral**: 8% sobre salário bruto
- **Jovem Aprendiz**: 2% sobre salário bruto
- **Doméstico**: 8% + 3,2% (seguro-desemprego)

### Avos (13º e Férias)

**13º Salário**:
- Regra: Mês com 15 dias ou mais = 1/12
- Desconta afastamentos INSS

**Férias**:
- Período aquisitivo: 12 meses
- 1 avo = 30 dias trabalhados
- 1/3 constitucional sobre valor proporcional

## 📄 Geração de PDF

### Biblioteca: pdf-lib

**Estrutura do PDF**:
1. Cabeçalho com título
2. Dados do usuário
3. Resultado do cálculo
4. Memória de cálculo passo a passo
5. Base legal

**Exemplo**:
```javascript
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]); // A4
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

page.drawText('CÁLCULO DE INSS', {
  x: 50,
  y: 800,
  size: 20,
  font
});
```

## 🎨 Frontend

### Tailwind CSS

**Configuração**:
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#DC2626',
          yellow: '#FBBF24'
        }
      }
    }
  }
}
```

### EJS Templates

**Estrutura**:
- `views/partials/`: Componentes reutilizáveis (navbar, header)
- `views/auth/`: Login e registro
- `views/dashboard/`: Painel principal
- `views/[modulo]/`: Views de cada módulo

**Variáveis Globais**:
- `user`: Dados do usuário logado
- `isAdmin`: Boolean de admin
- `title`: Título da página

## 🔄 Services (Lógica de Negócio)

### Princípios

1. **Separação de Responsabilidades**: Services não acessam banco diretamente
2. **Reutilização**: Services podem ser chamados por múltiplos controllers
3. **Testabilidade**: Lógica isolada facilita testes

### Exemplo: INSSService

```javascript
class INSSService {
  static calcular(salarioBruto, proLabore) {
    // Lógica de cálculo
    // Retorna objeto com resultado e memória
  }
}
```

## 📝 Boas Práticas

### Código

1. **Nomenclatura**: camelCase para variáveis, PascalCase para classes
2. **Comentários**: Explicar "porquê", não "o quê"
3. **Funções**: Uma responsabilidade por função
4. **Erros**: Sempre tratar e logar erros

### Banco de Dados

1. **Transações**: Usar para operações críticas
2. **Índices**: Criar em colunas frequentemente consultadas
3. **Constraints**: Usar UNIQUE, FOREIGN KEY, CHECK
4. **Migrations**: Manter histórico de mudanças

### Segurança

1. **Senhas**: Nunca armazenar em texto plano
2. **Sessões**: Rotacionar SESSION_SECRET regularmente
3. **Validação**: Validar entrada do usuário sempre
4. **HTTPS**: Usar em produção

## 🚀 Deploy

### Variáveis de Ambiente

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=senha_segura
SESSION_SECRET=secret_super_seguro_aleatorio
```

### Checklist de Deploy

- [ ] Banco de dados criado e migrado
- [ ] Variáveis de ambiente configuradas
- [ ] SESSION_SECRET alterado
- [ ] Senha do admin alterada
- [ ] HTTPS configurado
- [ ] Backup automático configurado
- [ ] Logs configurados
- [ ] Monitoramento ativo

## 📚 Referências Legais

### INSS
- **EC 103/2019**: Emenda Constitucional da Reforma da Previdência
- **Art. 201, § 1º da CF/88**: Contribuição previdenciária

### IRRF
- **IN RFB 1500/2014**: Tabela progressiva do IRRF
- **Art. 1º**: Base de cálculo e deduções

### FGTS
- **Lei 8.036/1990**: Fundo de Garantia
- **Art. 15**: Depósito mensal

### Férias
- **CLT Art. 130**: Período aquisitivo
- **CF/88 Art. 7º, XVII**: 1/3 constitucional

### 13º Salário
- **Lei 4.090/1962**: Gratificação natalina
- **Art. 1º**: Proporcionalidade

---

**Última atualização**: 2024
**Versão**: 1.0.0

