-- ============================================
-- MIGRATION 012: Criar tabela payment_tokens
-- Para validação de pagamento via token por email
-- ============================================

CREATE TABLE IF NOT EXISTS payment_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token UUID UNIQUE NOT NULL,
    order_nsu UUID NOT NULL REFERENCES orders(order_nsu) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_expires_at CHECK (expires_at > created_at)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_payment_tokens_token ON payment_tokens(token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_payment_tokens_order_nsu ON payment_tokens(order_nsu);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_email ON payment_tokens(email);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_user_id ON payment_tokens(user_id);

COMMENT ON TABLE payment_tokens IS 'Tokens únicos para validação de pagamento via email';
COMMENT ON COLUMN payment_tokens.token IS 'Token UUID único (one-time use)';
COMMENT ON COLUMN payment_tokens.order_nsu IS 'Pedido vinculado ao token';
COMMENT ON COLUMN payment_tokens.email IS 'Email onde o token foi enviado';
COMMENT ON COLUMN payment_tokens.used IS 'Se o token já foi usado';
COMMENT ON COLUMN payment_tokens.expires_at IS 'Data de expiração do token (30 dias, alinhado com duração da assinatura)';

