-- ============================================
-- SCRIPT PARA CRIAR O BANCO DE DADOS
-- Execute este script no PostgreSQL
-- ============================================

-- Criar banco de dados (execute como superusuário)
CREATE DATABASE suporte_dp
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'pt_BR.UTF-8'
    LC_CTYPE = 'pt_BR.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Conectar ao banco criado
\c suporte_dp

-- Criar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGORA EXECUTE O schema.sql
-- psql -U postgres -d suporte_dp -f database/schema.sql
-- ============================================

