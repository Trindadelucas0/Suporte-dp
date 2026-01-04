/**
 * SERVIDOR PRINCIPAL
 * Sistema de Cálculos Trabalhistas - Suporte DP
 *
 * Stack: Node.js + Express + EJS + PostgreSQL
 * Arquitetura: MVC (Model-View-Controller)
 */

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const path = require("path");
const db = require("./config/database");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const app = express();

// Configuração de proxy para Render (importante para cookies e sessões)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Confia no primeiro proxy (Render)
}

// Em modo de teste, usa porta diferente para evitar conflitos
const PORT = process.env.NODE_ENV === 'test' 
  ? (process.env.TEST_PORT || 3001)
  : (process.env.PORT || 3000);

// Validação e geração automática de SESSION_SECRET
let sessionSecretWarning = false;
if (!process.env.SESSION_SECRET) {
  const crypto = require('crypto');
  // Gera um secret seguro automaticamente
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  sessionSecretWarning = true;
  console.warn("⚠️  ATENÇÃO: SESSION_SECRET não foi configurado!");
  console.warn("💡 Um secret foi gerado automaticamente, mas é recomendado configurar manualmente no Render.");
  console.warn("💡 Para gerar um secret seguro: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.warn("💡 Configure no Render: Environment → Add Environment Variable → SESSION_SECRET");
}

// Helmet.js - Proteção de headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Permite inline event handlers (onclick, etc)
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      formAction: ["'self'"], // Permite formulários no mesmo domínio
    },
  },
}));

// Função para obter IP real (considera proxy do Render)
const getRealIp = (req) => {
  // Render usa X-Forwarded-For
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip;
};

// Rate Limiting Global (ajustado para produção no Render)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // 1000 em produção, 10000 em dev
  message: "Muitas requisições deste IP, tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
  // Usa IP real considerando proxy do Render
  keyGenerator: (req) => getRealIp(req),
  skip: (req) => {
    // Pula rate limiting para:
    // 1. Arquivos estáticos (CSS, JS, imagens, fonts)
    const isStaticFile = /\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);
    if (isStaticFile) return true;
    
    // 2. Requisições GET em desenvolvimento
    if (process.env.NODE_ENV !== 'production' && req.method === 'GET') {
      return true;
    }
    
    // 3. Health checks e favicon
    if (req.path === '/health' || req.path === '/favicon.ico') {
      return true;
    }
    
    return false;
  }
});

// Rate Limiting para Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de login
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getRealIp(req), // Usa IP real considerando proxy do Render
});

// Rate Limiting para Registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora por IP
  message: "Muitas tentativas de registro. Tente novamente em 1 hora.",
  keyGenerator: (req) => getRealIp(req), // Usa IP real considerando proxy do Render
});

// Cookie Parser (necessário para CSRF)
app.use(cookieParser());

// Middleware de parsing JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configuração de sessão com PostgreSQL
// SESSION_SECRET já foi validado/gerado acima
const sessionSecret = process.env.SESSION_SECRET;

// Configuração de sessão otimizada para Render
const sessionConfig = {
  store: new pgSession({
    pool: db.pool,
    tableName: "sessions",
    createTableIfMissing: true, // Cria tabela automaticamente se não existir
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // true em produção (HTTPS)
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict", // "lax" funciona melhor no Render
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    // domain não é necessário no Render
  },
  name: "suporte-dp.sid", // Nome customizado para evitar detecção
};

app.use(session(sessionConfig));

// Middleware para verificar inatividade (deve vir ANTES do trackActivity)
const { checkInactivity } = require('./middleware/activityTracker');
app.use((req, res, next) => {
  // Aplica verificação de inatividade apenas para usuários autenticados
  if (req.session && req.session.user) {
    const canContinue = checkInactivity(req, res);
    if (canContinue === false) {
      return; // Sessão expirada, já redirecionou
    }
  }
  next();
});

// Middleware para rastrear atividade do usuário (atualiza lastActivity)
const trackActivity = require('./middleware/activityTracker');
app.use(trackActivity);

// Middleware para disponibilizar dados do usuário nas views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user?.is_admin || false;
  next();
});

// Configuração do EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Arquivos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "public")));

// Rate Limiting Global (aplicado após arquivos estáticos para não contar requisições de assets)
app.use(globalLimiter);

// CSRF Protection (após sessão estar configurada)
// Desabilitado em modo de teste para facilitar testes automatizados
const csrf = require("csurf");
let csrfProtection;
let csrfHelper;

if (process.env.NODE_ENV === 'test') {
  // Em modo de teste, CSRF é desabilitado
  csrfProtection = (req, res, next) => next();
  csrfHelper = (req, res, next) => {
    res.locals.csrfToken = 'test-csrf-token';
    next();
  };
} else {
  // Em produção/desenvolvimento, CSRF está ativo
  // Configuração do CSRF para validar apenas métodos "unsafe" (POST, PUT, PATCH, DELETE)
  csrfProtection = csrf({ 
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // "lax" funciona melhor
      key: '_csrf'
    },
    // Ignora métodos GET, HEAD, OPTIONS (mas ainda gera tokens)
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    // Aceita token no header ou no body (case-insensitive para headers)
    value: (req) => {
      // Tenta do body primeiro (após parsing)
      if (req.body && req.body._csrf) {
        return req.body._csrf;
      }
      
      // Tenta headers (case-insensitive)
      const headerNames = ['x-csrf-token', 'x-csrftoken', 'csrf-token', 'X-CSRF-Token', 'X-CSRFToken', 'CSRF-Token'];
      for (const headerName of headerNames) {
        if (req.headers[headerName]) {
          return req.headers[headerName];
        }
      }
      
      // Tenta buscar em qualquer header que contenha csrf (case-insensitive)
      for (const key in req.headers) {
        if (key.toLowerCase().includes('csrf')) {
          return req.headers[key];
        }
      }
      
      return null;
    }
  });

  // Middleware para disponibilizar token CSRF nas views
  // O csrfProtection adiciona req.csrfToken(), então este helper apenas expõe nas views
  csrfHelper = (req, res, next) => {
    try {
      // O token CSRF só está disponível se o csrfProtection foi aplicado
      // Mas podemos tentar gerar um token mesmo sem proteção ativa
      if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
      } else {
        // Se não houver csrfToken disponível, tenta gerar um token básico
        // Isso é necessário para rotas públicas que ainda precisam do token
        res.locals.csrfToken = null;
      }
    } catch (error) {
      res.locals.csrfToken = null;
    }
    next();
  };
}

// Rotas
const authRoutes = require("./routes/auth");
const adquirirRoutes = require("./routes/adquirir");
const dashboardRoutes = require("./routes/dashboard");
const calendarioRoutes = require("./routes/calendario");
const inssRoutes = require("./routes/inss");
const irrfRoutes = require("./routes/irrf");
const fgtsRoutes = require("./routes/fgts");
const avosRoutes = require("./routes/avos");
const feriasRoutes = require("./routes/ferias");
const riscoMultaRoutes = require("./routes/risco-multa");
const contratoExperienciaRoutes = require("./routes/contrato-experiencia");
const periculosidadeRoutes = require("./routes/periculosidade");
const custoRoutes = require("./routes/custo");
const checklistRoutes = require("./routes/checklist");
const tarefasRoutes = require("./routes/tarefas");
const notificacoesRoutes = require("./routes/notificacoes");
const perfilRoutes = require("./routes/perfil");
const adminRoutes = require("./routes/admin");

// Rotas públicas (sem CSRF protection)
app.use("/", authRoutes);
app.use("/adquirir", adquirirRoutes);
app.use("/webhook", require("./routes/webhook")); // Webhooks não precisam de CSRF

// Rotas protegidas (com CSRF protection)
// Aplicamos CSRF apenas nas rotas protegidas
app.use(csrfProtection); // Protege POST/PUT/DELETE e adiciona req.csrfToken()
app.use(csrfHelper); // Disponibiliza token nas views
app.use("/dashboard", dashboardRoutes);
app.use("/calendario", calendarioRoutes);
app.use("/inss", inssRoutes);
app.use("/irrf", irrfRoutes);
app.use("/fgts", fgtsRoutes);
app.use("/avos", avosRoutes);
app.use("/ferias", feriasRoutes);
app.use("/risco-multa", riscoMultaRoutes);
app.use("/contrato-experiencia", contratoExperienciaRoutes);
app.use("/periculosidade", periculosidadeRoutes);
app.use("/custo", custoRoutes);
app.use("/checklist", checklistRoutes);
app.use("/tarefas", tarefasRoutes);
app.use("/notificacoes", notificacoesRoutes);
app.use("/perfil", perfilRoutes);
app.use("/admin", adminRoutes);

// Rota raiz - página inicial institucional
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render("index", {
      title: "Suporte DP - Sistema de Cálculos Trabalhistas",
    });
  }
});


// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  // Erro CSRF
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).render("error", {
      title: "Erro de Segurança",
      error: "Token CSRF inválido. Por favor, recarregue a página e tente novamente.",
    });
  }

  console.error("Erro:", err);
  res.status(err.status || 500).render("error", {
    title: "Erro",
    error:
      process.env.NODE_ENV === "development" 
        ? err.message || err 
        : "Erro interno do servidor",
  });
});

// Inicialização do servidor (apenas se não estiver em modo de teste)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || "development"}`);
    
    // Mostra aviso sobre SESSION_SECRET se foi gerado automaticamente
    if (sessionSecretWarning) {
      console.warn("⚠️  IMPORTANTE: Configure SESSION_SECRET no painel do Render para maior segurança!");
    }

    // Testa conexão com banco e inicializa tabelas
    try {
      await db.pool.query("SELECT NOW()");
      console.log("✅ Conexão com PostgreSQL estabelecida");

      // Inicializa banco de dados automaticamente (cria tabelas se não existirem)
      const initDatabase = require("./scripts/auto-init-database-psql");
      await initDatabase();
    } catch (error) {
      console.error("❌ Erro ao conectar com PostgreSQL:", error.message);
      
      // Verifica se é erro de conexão (ECONNREFUSED) indicando variáveis não configuradas
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.error('');
        console.error('🔴 PROBLEMA: Variáveis de ambiente do banco não configuradas!');
        console.error('');
        console.error('📋 Configure as seguintes variáveis no Render:');
        console.error('   1. Acesse seu Web Service no Render');
        console.error('   2. Vá em "Environment" → "Add Environment Variable"');
        console.error('   3. Adicione as variáveis:');
        console.error('      - DB_HOST (do painel do PostgreSQL → Connections → Hostname)');
        console.error('      - DB_PORT (geralmente 5432)');
        console.error('      - DB_NAME (do painel do PostgreSQL → Connections → Database)');
        console.error('      - DB_USER (do painel do PostgreSQL → Connections → Username)');
        console.error('      - DB_PASSWORD (do painel do PostgreSQL → Connections → Password)');
        console.error('');
        console.error('💡 Como obter essas informações:');
        console.error('   - Acesse seu banco PostgreSQL no Render');
        console.error('   - Clique em "Connections"');
        console.error('   - Copie os valores mostrados lá');
        console.error('');
      } else {
        console.error("💡 Verifique se o PostgreSQL está rodando e as configurações no .env");
      }
    }
  });
}

module.exports = app;
