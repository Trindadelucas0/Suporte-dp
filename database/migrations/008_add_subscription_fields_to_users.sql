-- ============================================
-- MIGRATION 008: Adicionar campos de assinatura na tabela users
-- Sistema de pagamentos InfinitePay
-- ============================================

-- Adicionar campo order_nsu (vincula usuário ao pedido)
ALTER TABLE users ADD COLUMN IF NOT EXISTS order_nsu UUID REFERENCES orders(order_nsu) ON DELETE SET NULL;

-- Adicionar campo whatsapp (se não existir)
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- Adicionar campo status (ativo, bloqueado)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo'; -- ativo, bloqueado

-- Adicionar campo subscription_status (ativa, inadimplente, cancelada)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ativa'; -- ativa, inadimplente, cancelada

-- Adicionar campo subscription_expires_at (data de expiração da assinatura)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at DATE;

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_order_nsu ON users(order_nsu);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON users(subscription_expires_at);

-- Atualizar usuários existentes sem status para 'ativo'
UPDATE users SET status = 'ativo' WHERE status IS NULL;
UPDATE users SET subscription_status = 'ativa' WHERE subscription_status IS NULL;

