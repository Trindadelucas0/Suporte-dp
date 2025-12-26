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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão com PostgreSQL
app.use(
  session({
    store: new pgSession({
      pool: db.pool,
      tableName: "sessions",
    }),
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
    },
  })
);

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

// Rotas
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const calendarioRoutes = require("./routes/calendario");
const inssRoutes = require("./routes/inss");
const irrfRoutes = require("./routes/irrf");
const fgtsRoutes = require("./routes/fgts");
const avosRoutes = require("./routes/avos");
const periculosidadeRoutes = require("./routes/periculosidade");
const custoRoutes = require("./routes/custo");
const checklistRoutes = require("./routes/checklist");
const pdfRoutes = require("./routes/pdf");
const adminRoutes = require("./routes/admin");

app.use("/", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/calendario", calendarioRoutes);
app.use("/inss", inssRoutes);
app.use("/irrf", irrfRoutes);
app.use("/fgts", fgtsRoutes);
app.use("/avos", avosRoutes);
app.use("/periculosidade", periculosidadeRoutes);
app.use("/custo", custoRoutes);
app.use("/checklist", checklistRoutes);
app.use("/pdf", pdfRoutes);
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
  console.error("Erro:", err);
  res.status(500).render("error", {
    title: "Erro",
    error:
      process.env.NODE_ENV === "development" ? err : "Erro interno do servidor",
  });
});

// Inicialização do servidor
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

module.exports = app;
