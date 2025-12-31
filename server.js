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
// Em modo de teste, usa porta diferente para evitar conflitos
const PORT = process.env.NODE_ENV === 'test' 
  ? (process.env.TEST_PORT || 3001)
  : (process.env.PORT || 3000);

// Validação de SESSION_SECRET
if (!process.env.SESSION_SECRET) {
  console.error("❌ ERRO CRÍTICO: SESSION_SECRET não configurado no .env");
  console.error("💡 Gere um secret seguro: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
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
    },
  },
}));

// Rate Limiting Global (menos restritivo em desenvolvimento)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 em dev, 100 em produção
  message: "Muitas requisições deste IP, tente novamente em 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pula rate limiting para requisições GET em desenvolvimento
    return process.env.NODE_ENV !== 'production' && req.method === 'GET';
  }
});
app.use(globalLimiter);

// Rate Limiting para Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de login
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  skipSuccessfulRequests: true,
});

// Rate Limiting para Registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora por IP
  message: "Muitas tentativas de registro. Tente novamente em 1 hora.",
});

// Cookie Parser (necessário para CSRF)
app.use(cookieParser());

// Middleware de parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configuração de sessão com PostgreSQL
const sessionSecret = process.env.SESSION_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET é obrigatório em produção!");
  }
  console.warn("⚠️  Usando SESSION_SECRET temporário. Configure no .env para produção!");
  return "temporary-secret-change-in-production-" + Date.now();
})();

app.use(
  session({
    store: new pgSession({
      pool: db.pool,
      tableName: "sessions",
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    },
    name: "suporte-dp.sid", // Nome customizado para evitar detecção
  })
);

// Middleware para rastrear atividade do usuário
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
      sameSite: "strict"
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
const perfilRoutes = require("./routes/perfil");
const adminRoutes = require("./routes/admin");

// Rotas públicas (sem CSRF protection)
app.use("/", authRoutes);

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
app.use("/perfil", perfilRoutes);
app.use("/admin", adminRoutes);

// Rota raiz - página de boas-vindas (prioriza cadastro)
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render("welcome", {
      title: "Bem-vindo - Suporte DP",
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

    // Testa conexão com banco e inicializa tabelas
    try {
      await db.pool.query("SELECT NOW()");
      console.log("✅ Conexão com PostgreSQL estabelecida");

      // Inicializa banco de dados automaticamente (cria tabelas se não existirem)
      const initDatabase = require("./scripts/auto-init-database-psql");
      await initDatabase();
    } catch (error) {
      console.error("❌ Erro ao conectar com PostgreSQL:", error.message);
      console.error(
        "💡 Verifique se o PostgreSQL está rodando e as configurações no .env"
      );
    }
  });
}

module.exports = app;
