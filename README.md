# 🧮 Suporte DP - Sistema Educacional de Cálculos Trabalhistas

Sistema web completo para cálculos trabalhistas seguindo a legislação brasileira, com foco em educação, transparência e memória de cálculo detalhada.

## 📋 Índice

- [Características](#características)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Arquitetura](#arquitetura)
- [Módulos](#módulos)
- [Base Legal](#base-legal)
- [Documentação Técnica](#documentação-técnica)

## ✨ Características

- ✅ **Cálculos Transparentes**: Nada é "caixa-preta" - todos os cálculos mostram passo a passo
- 📚 **Educacional**: Explicações claras e base legal para cada cálculo
- 💾 **Histórico**: Todos os cálculos são salvos por usuário
- 📄 **PDF Profissional**: Geração de PDFs com memória de cálculo completa
- 📅 **Calendário de Obrigações**: Dias úteis, feriados e anotações
- ✅ **Checklists**: Processos de admissão e rescisão atualizados
- 🔐 **Seguro**: Autenticação com sessões e senhas criptografadas
- 📱 **Responsivo**: Funciona perfeitamente em desktop e mobile
- 🎨 **UI Moderna**: Design com cores vermelho e amarelo, intuitivo e didático

## 🛠 Stack Tecnológica

### Backend
- **Node.js** + **Express**: Servidor web
- **PostgreSQL**: Banco de dados relacional
- **bcrypt**: Criptografia de senhas
- **express-session**: Gerenciamento de sessões
- **connect-pg-simple**: Sessões no PostgreSQL

### Frontend
- **EJS**: Template engine
- **Tailwind CSS**: Framework CSS utilitário
- **Font Awesome**: Ícones

### Outras Bibliotecas
- **pdf-lib**: Geração de PDFs
- **moment**: Manipulação de datas
- **express-validator**: Validação de formulários

## 📁 Estrutura do Projeto

```
suporte-dp/
├── config/
│   └── database.js          # Configuração do PostgreSQL
├── controllers/              # Controllers (MVC)
│   ├── authController.js
│   ├── dashboardController.js
│   ├── calendarioController.js
│   ├── inssController.js
│   ├── irrfController.js
│   ├── fgtsController.js
│   ├── avosController.js
│   ├── periculosidadeController.js
│   ├── custoController.js
│   ├── checklistController.js
│   ├── pdfController.js
│   └── adminController.js
├── database/
│   ├── schema.sql           # Estrutura do banco
│   └── seed.sql             # Dados iniciais
├── middleware/
│   └── auth.js               # Middleware de autenticação
├── models/                   # Models (MVC)
│   ├── User.js
│   └── Feriado.js
├── routes/                   # Rotas (MVC)
│   ├── auth.js
│   ├── dashboard.js
│   ├── calendario.js
│   ├── inss.js
│   ├── irrf.js
│   ├── fgts.js
│   ├── avos.js
│   ├── periculosidade.js
│   ├── custo.js
│   ├── checklist.js
│   ├── pdf.js
│   └── admin.js
├── scripts/
│   └── init-database.js      # Script de inicialização
├── services/                 # Lógica de negócio
│   ├── calendarioService.js
│   ├── inssService.js
│   ├── irrfService.js
│   ├── fgtsService.js
│   ├── avosService.js
│   ├── periculosidadeService.js
│   └── custoService.js
├── views/                    # Templates EJS
│   ├── auth/
│   ├── dashboard/
│   ├── calendario/
│   ├── inss/
│   ├── irrf/
│   ├── fgts/
│   ├── avos/
│   ├── periculosidade/
│   ├── custo/
│   ├── checklist/
│   ├── admin/
│   └── partials/
├── .env.example              # Exemplo de variáveis de ambiente
├── .gitignore
├── package.json
├── server.js                  # Servidor principal
└── README.md
```

## 🚀 Instalação

### Pré-requisitos

- Node.js (v14 ou superior)
- PostgreSQL (v12 ou superior)
- npm ou yarn

### Passos

1. **Clone o repositório** (ou extraia os arquivos)

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure o banco de dados PostgreSQL**:
   - Crie um banco de dados chamado `suporte_dp`
   - Ou altere o nome no arquivo `.env`

4. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas configurações:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=suporte_dp
DB_USER=postgres
DB_PASSWORD=sua_senha
SESSION_SECRET=seu_secret_super_seguro
```

5. **Inicialize o banco de dados**:
```bash
npm run init-db
```

6. **Inicie o servidor**:
```bash
npm start
# ou para desenvolvimento com auto-reload:
npm run dev
```

7. **Acesse o sistema**:
   - Abra o navegador em `http://localhost:3000`
   - Faça login com:
     - Email: `admin@suportedp.com`
     - Senha: `admin123` (⚠️ **ALTERE IMEDIATAMENTE EM PRODUÇÃO**)

## ⚙️ Configuração

### Banco de Dados

O sistema usa PostgreSQL com as seguintes tabelas principais:

- `users`: Usuários do sistema
- `feriados`: Feriados nacionais
- `calendario_anotacoes`: Anotações do calendário
- `calculos_inss`: Histórico de cálculos de INSS
- `calculos_irrf`: Histórico de cálculos de IRRF
- `calculos_fgts`: Histórico de cálculos de FGTS
- `calculos_avos`: Histórico de cálculos de avos
- `calculos_periculosidade`: Histórico de periculosidade/insalubridade
- `calculos_custo`: Histórico de custos
- `checklists`: Checklists de processos
- `checklist_itens`: Itens dos checklists
- `notificacoes`: Notificações do sistema
- `sessions`: Sessões do Express

### Segurança

- Senhas são criptografadas com bcrypt (10 rounds)
- Sessões armazenadas no PostgreSQL
- Proteção de rotas com middleware de autenticação
- Validação de formulários com express-validator

## 📖 Uso

### Criar Conta

1. Acesse `/register`
2. Preencha nome, email e senha
3. Faça login automaticamente

### Calcular INSS

1. Acesse `/inss`
2. Informe o salário bruto
3. Marque "Pró-labore" se aplicável
4. Clique em "Calcular"
5. Visualize:
   - **Calculadora**: Resultado principal
   - **Memória de Cálculo**: Passo a passo
   - **Base Legal**: Legislação aplicável

### Calcular IRRF

1. Acesse `/irrf`
2. Informe salário bruto, dependentes e pensão (se houver)
3. O sistema calcula INSS automaticamente
4. Visualize o resultado com memória completa

### Calendário

1. Acesse `/calendario`
2. Visualize o mês atual com feriados
3. Clique em uma data para adicionar anotação
4. Calcule dias úteis entre duas datas

### Checklists

1. Acesse `/checklist`
2. Escolha "Admissão" ou "Rescisão"
3. Marque os itens conforme concluídos
4. Adicione observações

## 🏗 Arquitetura

### Padrão MVC

O sistema segue o padrão **Model-View-Controller**:

- **Models**: Acesso ao banco de dados (`models/`)
- **Views**: Templates EJS (`views/`)
- **Controllers**: Lógica de controle (`controllers/`)
- **Services**: Lógica de negócio (`services/`)
- **Routes**: Definição de rotas (`routes/`)

### Fluxo de Dados

```
Cliente → Rota → Middleware (Auth) → Controller → Service → Model → Banco
                ↓
              View (EJS) ← Controller ← Service ← Model ← Banco
```

### Boas Práticas

1. **Separação de Responsabilidades**: Cada camada tem sua função
2. **Services**: Toda lógica de cálculo está nos services
3. **Validação**: Formulários validados com express-validator
4. **Segurança**: Senhas criptografadas, sessões seguras
5. **Educação**: Cada cálculo mostra memória e base legal

## 📚 Módulos

### 1. Calendário de Obrigações

- Calendário mensal interativo
- Feriados nacionais cadastrados
- Cálculo de dias úteis (seg-sex ou seg-sáb)
- Anotações por data
- Explicação de DSR (Descanso Semanal Remunerado)

### 2. Calculadora de INSS

- Cálculo progressivo por faixas (EC 103/2019)
- Suporte a pró-labore (11% fixo)
- Memória de cálculo detalhada
- Visualização de faixas tributadas

### 3. Calculadora de IRRF

- Cálculo com base após INSS
- Dedução de dependentes (R$ 189,59 cada)
- Dedução de pensão alimentícia
- Tabela progressiva atualizada

### 4. Calculadora de FGTS

- CLT Geral: 8%
- Jovem Aprendiz: 2%
- Doméstico: 8% + 3,2%
- Explicação educacional

### 5. Calculadora de Avos

- 13º Salário: cálculo proporcional
- Férias: período aquisitivo de 12 meses
- Considera afastamentos INSS
- Cálculo de 1/3 constitucional

### 6. Periculosidade e Insalubridade

- Periculosidade: 30% sobre salário base
- Insalubridade: 10%, 20% ou 40% sobre salário mínimo
- Comparação educacional
- Base legal CLT

### 7. Simulador de Custo

- Agrega todos os custos:
  - Salário bruto
  - Férias (1/12 + 1/3)
  - 13º (1/12)
  - FGTS
  - Encargos
  - Benefícios
- Custo mensal e anual
- Memória completa

### 8. Checklists

- **Admissão**: Documentos, exames, cadastros
- **Rescisão**: Aviso prévio, exames, eSocial
- Itens marcáveis
- Observações por item

## ⚖️ Base Legal

### INSS
- **Emenda Constitucional nº 103/2019**
- Art. 201, § 1º da CF/88

### IRRF
- **Instrução Normativa RFB nº 1500/2014**
- Tabela progressiva atualizada

### FGTS
- **Lei nº 8.036/1990**
- Art. 15

### Férias
- **CLT - Art. 130**
- Art. 7º, XVII da CF/88 (1/3 constitucional)

### 13º Salário
- **Lei nº 4.090/1962**
- Art. 1º

### Periculosidade
- **CLT - Art. 193**
- 30% sobre salário base

### Insalubridade
- **CLT - Art. 189**
- 10%, 20% ou 40% sobre salário mínimo

## 📝 Documentação Técnica

### Fórmulas Matemáticas

#### INSS Progressivo
```
Faixa 1: até R$ 1.412,00 → 7,5%
Faixa 2: até R$ 2.666,68 → 9,0%
Faixa 3: até R$ 4.000,03 → 12,0%
Faixa 4: até R$ 7.786,02 → 14,0% (teto)
```

#### IRRF
```
Base IR = Salário Bruto - INSS - (Dependentes × 189,59) - Pensão
IRRF = (Base × Alíquota) - Dedução
```

#### FGTS
```
CLT Geral: Salário × 8%
Jovem Aprendiz: Salário × 2%
Doméstico: Salário × 8% + Salário × 3,2%
```

#### Férias
```
Valor Proporcional = (Salário × Avos) / 12
1/3 Constitucional = Valor Proporcional / 3
Total = Valor Proporcional + 1/3
```

### Modelagem do Banco

#### Relacionamentos

- `users` 1:N `calculos_*` (um usuário tem muitos cálculos)
- `users` 1:N `checklists` (um usuário tem muitos checklists)
- `checklists` 1:N `checklist_itens` (um checklist tem muitos itens)
- `users` 1:N `calendario_anotacoes` (um usuário tem muitas anotações)

#### Índices

- `users.email`: Índice único para busca rápida
- `feriados.data`: Índice para busca por data
- `calculos_*.user_id, created_at`: Índices compostos para histórico

## 🔒 Segurança

- Senhas: bcrypt com 10 rounds
- Sessões: armazenadas no PostgreSQL
- Cookies: httpOnly, secure em produção
- Validação: express-validator em todos os formulários
- SQL Injection: proteção com parâmetros preparados (pg)

## 🎨 Design

- **Cores**: Vermelho (#DC2626) e Amarelo (#FBBF24)
- **Framework**: Tailwind CSS
- **Ícones**: Font Awesome
- **Responsivo**: Mobile-first

## 📄 Licença

Este projeto é educacional e de uso interno.

## 👨‍💻 Desenvolvimento

### Estrutura de Commits

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `test`: Testes

### Próximos Passos

- [ ] Testes automatizados
- [ ] Notificações inteligentes
- [ ] Exportação para Excel
- [ ] API REST
- [ ] Dashboard com gráficos
- [ ] Tutorial interativo (Shepherd.js)

---

**Desenvolvido com foco em educação e transparência** 🎓

