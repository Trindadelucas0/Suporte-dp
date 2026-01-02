-- ============================================
-- MIGRAÇÃO: Cria tabela de links de ativação
-- Sistema de ativação de usuário via venda
-- ============================================

-- Tabela para armazenar links de cadastro gerados via webhook
CREATE TABLE IF NOT EXISTS activation_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    nome_cliente VARCHAR(255),
    plataforma VARCHAR(50) NOT NULL, -- kiwify, hotmart, kirvano
    venda_id VARCHAR(255), -- ID da venda na plataforma
    venda_data JSONB, -- Dados completos da venda (para auditoria)
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_activation_links_token ON activation_links(token);
CREATE INDEX IF NOT EXISTS idx_activation_links_email ON activation_links(email);
CREATE INDEX IF NOT EXISTS idx_activation_links_status ON activation_links(status);
CREATE INDEX IF NOT EXISTS idx_activation_links_platform ON activation_links(plataforma);
CREATE INDEX IF NOT EXISTS idx_activation_links_expires ON activation_links(expires_at);

-- Índice composto para busca por token e status
CREATE INDEX IF NOT EXISTS idx_activation_links_token_status ON activation_links(token, status);

-- Comentários para documentação
COMMENT ON TABLE activation_links IS 'Links de cadastro gerados via webhook de vendas';
COMMENT ON COLUMN activation_links.token IS 'Token único e seguro para validação do link';
COMMENT ON COLUMN activation_links.status IS 'Status: pending (aguardando uso), used (já utilizado), expired (expirado)';
COMMENT ON COLUMN activation_links.venda_data IS 'Dados completos da venda recebida via webhook (JSON)';

