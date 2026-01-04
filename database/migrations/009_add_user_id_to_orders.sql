-- ============================================
-- MIGRATION 009: Adicionar user_id na tabela orders
-- Para identificar usuário em renovações de assinatura
-- ============================================

-- Adicionar campo user_id na tabela orders (NULL para primeiro pagamento, preenchido para renovação)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Comentário explicativo
COMMENT ON COLUMN orders.user_id IS 'ID do usuário (NULL para primeiro pagamento, preenchido para renovação)';

