-- ============================================
-- MIGRATION 010: Adicionar campo customer_email na tabela orders
-- Para vincular pagamento ao usuário por email
-- ============================================

-- Adicionar campo customer_email na tabela orders (para vincular pagamento ao usuário)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

-- Índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- Comentário explicativo
COMMENT ON COLUMN orders.customer_email IS 'Email do cliente (para vincular pagamento ao usuário)';



