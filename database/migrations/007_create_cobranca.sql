-- ============================================
-- MIGRATION: 007_create_cobranca.sql
-- Sistema de Cobrança Recorrente
-- ============================================

-- Criar tabela cobrancas
CREATE TABLE IF NOT EXISTS cobrancas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_id VARCHAR(255) UNIQUE,              -- ID do InfinitePay
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- pendente, paga, vencida, cancelada
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMP,
    link_pagamento TEXT,
    mes_referencia VARCHAR(7) NOT NULL,          -- YYYY-MM
    lembretes_enviados JSONB DEFAULT '[]',       -- Array de lembretes enviados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_status CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada'))
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_cobrancas_user ON cobrancas(user_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status ON cobrancas(status);
CREATE INDEX IF NOT EXISTS idx_cobrancas_vencimento ON cobrancas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_cobrancas_mes ON cobrancas(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_cobrancas_user_mes ON cobrancas(user_id, mes_referencia);

-- Criar trigger para atualizar updated_at (se função existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_cobrancas_updated_at 
            BEFORE UPDATE ON cobrancas
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Adicionar campos na tabela users (se não existirem)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bloqueado_pagamento BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_ultima_cobranca DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_proximo_vencimento DATE;

-- Criar tabela links_ativacao (para liberação após pagamento)
CREATE TABLE IF NOT EXISTS links_ativacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para links_ativacao
CREATE INDEX IF NOT EXISTS idx_links_ativacao_token ON links_ativacao(token);
CREATE INDEX IF NOT EXISTS idx_links_ativacao_user ON links_ativacao(user_id);
CREATE INDEX IF NOT EXISTS idx_links_ativacao_nao_usado ON links_ativacao(token) WHERE usado = FALSE;

