-- ============================================
-- MIGRAÇÃO: Adiciona campos necessários na tabela users
-- e cria tabela de sugestões/bugs
-- ============================================

-- Adiciona campos na tabela users (se não existirem)
DO $$ 
BEGIN
    -- Campo para rastrear último login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
    
    -- Campo para ativar/desativar conta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'ativo') THEN
        ALTER TABLE users ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Campo para bloquear acesso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'bloqueado') THEN
        ALTER TABLE users ADD COLUMN bloqueado BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Cria tabela de sugestões e bugs
CREATE TABLE IF NOT EXISTS sugestoes_bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('sugestao', 'bug')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'fechada')),
    resposta_admin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_sugestoes_user ON sugestoes_bugs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sugestoes_status ON sugestoes_bugs(status);
CREATE INDEX IF NOT EXISTS idx_sugestoes_tipo ON sugestoes_bugs(tipo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sugestoes_updated_at BEFORE UPDATE ON sugestoes_bugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atualiza todos os usuários existentes para ativo = true
UPDATE users SET ativo = TRUE WHERE ativo IS NULL;
UPDATE users SET bloqueado = FALSE WHERE bloqueado IS NULL;




