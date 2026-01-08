-- ============================================
-- MIGRATION 008: Adicionar campos de assinatura na tabela users
-- Sistema de pagamentos InfinitePay
-- ============================================

-- Adicionar campo order_nsu (vincula usuário ao pedido)
-- Primeiro adiciona a coluna sem constraint (caso orders não exista ainda)
ALTER TABLE users ADD COLUMN IF NOT EXISTS order_nsu UUID;

-- Depois adiciona a constraint apenas se a tabela orders existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        -- Remove constraint antiga se existir
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_order_nsu_fkey;
        -- Adiciona constraint
        ALTER TABLE users ADD CONSTRAINT users_order_nsu_fkey 
            FOREIGN KEY (order_nsu) REFERENCES orders(order_nsu) ON DELETE SET NULL;
    END IF;
END $$;

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



