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

// Configuração de proxy para VPS
// Se tiver Nginx/Apache como proxy reverso, configure HAS_REVERSE_PROXY=true
// Se estiver rodando direto na VPS sem proxy, deixe false ou não defina
if (process.env.HAS_REVERSE_PROXY === 'true') {
  app.set('trust proxy', 1); // Confia no proxy reverso (Nginx/Apache)
} else {
  app.set('trust proxy', false); // VPS direto, sem proxy
}

// Em modo de teste, usa porta diferente para evitar conflitos
const PORT = process.env.NODE_ENV === 'test' 
  ? (process.env.TEST_PORT || 3001)
  : (process.env.PORT || 3000);

// Validação e geração automática de SESSION_SECRET
// ⚠️ IMPORTANTE: SESSION_SECRET é crítico para segurança de sessões
// Em produção, DEVE ser configurado como variável de ambiente
let sessionSecretWarning = false;
if (!process.env.SESSION_SECRET) {
  const crypto = require('crypto');
  // Gera um secret seguro automaticamente (apenas para desenvolvimento)
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  sessionSecretWarning = true;
  console.warn("⚠️  ATENÇÃO: SESSION_SECRET não foi configurado!");
  console.warn("💡 Um secret foi gerado automaticamente, mas é recomendado configurar manualmente no Render.");
  console.warn("💡 PROBLEMA: Em produção, isso pode causar problemas de sessão (cookies não funcionam corretamente)");
  console.warn("💡 Para gerar um secret seguro: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  console.warn("💡 Configure no Render: Environment → Add Environment Variable → SESSION_SECRET");
  console.warn("💡 Valor gerado automaticamente (NÃO usar em produção):", process.env.SESSION_SECRET.substring(0, 20) + "...");
}

// Helmet.js - Proteção de headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Permite inline event handlers (onclick, etc)
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      formAction: ["'self'"], // Permite formulários no mesmo domínio
      connectSrc: ["'self'", "https://api.infinitepay.io"], // Permite chamadas para API InfinitePay
    },
  },
}));

// Função para obter IP real (VPS com ou sem proxy reverso)
const getRealIp = (req) => {
  // Se tiver proxy reverso (Nginx/Apache), IP vem no header
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }
  // VPS direto (sem proxy reverso)
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip ||
         '127.0.0.1';
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
  keyGenerator: (req) => getRealIp(req), // Usa IP real (VPS com ou sem proxy)
});

// Rate Limiting para Registro
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora por IP
  message: "Muitas tentativas de registro. Tente novamente em 1 hora.",
  keyGenerator: (req) => getRealIp(req), // Usa IP real (VPS com ou sem proxy)
});

// Cookie Parser (necessário para CSRF)
app.use(cookieParser());

// Middleware de parsing JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configuração de sessão com PostgreSQL
// SESSION_SECRET já foi validado/gerado acima
const sessionSecret = process.env.SESSION_SECRET;

// Detecta HTTPS para VPS (usa variável de ambiente)
// Se sua VPS tem HTTPS (Let's Encrypt, etc), defina HAS_HTTPS=true
// Se não tem HTTPS, deixe undefined ou false
const hasHTTPS = process.env.FORCE_HTTPS === 'true' || 
                 process.env.HAS_HTTPS === 'true';

// Configuração de sessão otimizada para VPS
const sessionConfig = {
  store: new pgSession({
    pool: db.pool,
    tableName: "sessions",
    createTableIfMissing: true, // Cria tabela automaticamente se não existir
  }),
  secret: sessionSecret,
  resave: false, // Não salva sessão se não foi modificada
  saveUninitialized: false, // Não cria sessão para requisições sem dados de sessão
  cookie: {
    secure: hasHTTPS, // true apenas se realmente tiver HTTPS configurado
    httpOnly: true, // Cookie não acessível via JavaScript (segurança)
    sameSite: 'lax', // Funciona bem em HTTP e HTTPS
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    path: '/', // Garante que cookie funciona em todas as rotas
    // domain: undefined permite funcionar em qualquer domínio/IP
  },
  name: "suporte-dp.sid", // Nome customizado
};

app.use(session(sessionConfig));

// Middleware para verificar inatividade (deve vir ANTES do trackActivity)
// IMPORTANTE: Não bloqueia rotas públicas (login, register, etc)
const { checkInactivity } = require('./middleware/activityTracker');
app.use((req, res, next) => {
  // Lista de rotas públicas que não devem ser bloqueadas
  // Rotas exatas e prefixos de rotas públicas
  const publicRoutesExact = ['/login', '/register', '/logout', '/validar-pagamento', '/'];
  const publicRoutesPrefix = ['/adquirir', '/legal', '/webhook'];
  
  // Verifica se é rota pública exata
  const isPublicExact = publicRoutesExact.includes(req.path);
  
  // Verifica se é rota pública por prefixo (mas não apenas "/")
  const isPublicPrefix = publicRoutesPrefix.some(prefix => req.path === prefix || req.path.startsWith(prefix + '/'));
  
  // Se é rota pública, pula verificação de inatividade
  if (isPublicExact || isPublicPrefix) {
    return next();
  }
  
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
      secure: hasHTTPS, // Usa mesma detecção de HTTPS da sessão
      sameSite: 'lax', // Funciona bem em HTTP e HTTPS
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
const renovarRoutes = require("./routes/renovar");
const checkoutRoutes = require("./routes/checkout");
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
// IMPORTANTE: Rotas de auth devem vir ANTES da rota raiz para garantir prioridade
app.use("/", authRoutes);

// Rota raiz - página inicial institucional (DEVE VIR DEPOIS DAS ROTAS DE AUTH)
// Isso garante que /login, /register, etc. tenham prioridade sobre /
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render("index", {
      title: "Suporte DP - Sistema de Cálculos Trabalhistas",
    });
  }
});
app.use("/adquirir", adquirirRoutes);
app.use("/webhook", require("./routes/webhook")); // Webhooks não precisam de CSRF

// Rotas públicas legais (sem CSRF protection)
const legalRoutes = require("./routes/legal");
app.use("/legal", legalRoutes);

// Rotas protegidas (com CSRF protection)
// Aplicamos CSRF apenas nas rotas protegidas
app.use(csrfProtection); // Protege POST/PUT/DELETE e adiciona req.csrfToken()
app.use(csrfHelper); // Disponibiliza token nas views
app.use("/renovar", renovarRoutes);
app.use("/checkout", checkoutRoutes);
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

      // Executa diagnóstico do fluxo de pagamento (assíncrono, não bloqueia servidor)
      setImmediate(async () => {
        try {
          const { diagnosticarFluxo } = require("./scripts/diagnostico-fluxo-pagamento");
          console.log("\n🔍 Executando diagnóstico do fluxo de pagamento...");
          await diagnosticarFluxo();
        } catch (diagnosticoError) {
          // Não bloqueia o servidor se houver erro no diagnóstico
          console.warn("⚠️  Aviso: Erro ao executar diagnóstico (não crítico):", diagnosticoError.message);
        }
      });

      // Envia email de teste ao iniciar servidor (assíncrono, não bloqueia servidor)
      setImmediate(async () => {
        try {
          const enviarEmailTesteInicio = require("./scripts/test-email-inicio-servidor");
          await enviarEmailTesteInicio();
        } catch (emailTestError) {
          // Não bloqueia o servidor se houver erro no teste de email
          console.warn("⚠️  Aviso: Erro ao enviar email de teste (não crítico):", emailTestError.message);
        }
      });
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
