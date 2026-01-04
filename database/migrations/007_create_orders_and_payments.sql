-- ============================================
-- MIGRATION 007: Criar tabelas orders e payments
-- Sistema de pagamentos InfinitePay
-- ============================================

-- Extensão para UUIDs (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: orders (Pedidos)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_nsu UUID UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
    valor DECIMAL(10,2) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checkout_url TEXT,
    invoice_slug VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_order_nsu ON orders(order_nsu);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============================================
-- TABELA: payments (Pagamentos)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_nsu UUID NOT NULL REFERENCES orders(order_nsu) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL até cadastro
    transaction_nsu VARCHAR(255) NOT NULL UNIQUE,
    invoice_slug VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL,
    capture_method VARCHAR(50), -- credit_card, pix, boleto, etc.
    receipt_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'paid', -- paid, refunded
    paid_at TIMESTAMP NOT NULL,
    next_billing_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_order_nsu ON payments(order_nsu);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_nsu ON payments(transaction_nsu);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- TRIGGER: Atualizar updated_at em orders
-- ============================================
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- TRIGGER: Atualizar updated_at em payments
-- ============================================
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments
    FOR EACH ROW 
    EXECUTE FUNCTION update_payments_updated_at();

