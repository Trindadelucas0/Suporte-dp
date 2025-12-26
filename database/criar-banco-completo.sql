-- ============================================
-- SCRIPT COMPLETO PARA CRIAR BANCO E TABELAS
-- Execute este script no PostgreSQL
-- ============================================

-- 1. Criar banco de dados (execute como superusuário)
CREATE DATABASE suporte_dp
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'pt_BR.UTF-8'
    LC_CTYPE = 'pt_BR.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- 2. Conectar ao banco criado
\c suporte_dp

-- 3. Criar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. Agora execute o schema.sql que está na pasta database/
-- Ou copie e cole o conteúdo do schema.sql aqui

-- ============================================
-- INSTRUÇÕES:
-- ============================================
-- Opção 1: Execute este arquivo primeiro, depois execute schema.sql
-- psql -U postgres -f database/criar-banco-completo.sql
-- psql -U postgres -d suporte_dp -f database/schema.sql

-- Opção 2: Use o servidor Node.js que cria automaticamente
-- npm start (as tabelas serão criadas automaticamente)

