-- ============================================
-- MIGRAÇÃO: Adiciona campos de perfil do usuário
-- ============================================

-- Adiciona campos de perfil na tabela users (se não existirem)
DO $$ 
BEGIN
    -- Telefone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'telefone') THEN
        ALTER TABLE users ADD COLUMN telefone VARCHAR(20);
    END IF;
    
    -- WhatsApp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'whatsapp') THEN
        ALTER TABLE users ADD COLUMN whatsapp VARCHAR(20);
    END IF;
    
    -- Empresa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'empresa') THEN
        ALTER TABLE users ADD COLUMN empresa VARCHAR(255);
    END IF;
    
    -- Cargo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'cargo') THEN
        ALTER TABLE users ADD COLUMN cargo VARCHAR(255);
    END IF;
    
    -- Observações
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'observacoes') THEN
        ALTER TABLE users ADD COLUMN observacoes TEXT;
    END IF;
    
    -- Instagram
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'instagram') THEN
        ALTER TABLE users ADD COLUMN instagram VARCHAR(255);
    END IF;
    
    -- Campo para rastrear última atividade (última requisição)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'ultima_atividade') THEN
        ALTER TABLE users ADD COLUMN ultima_atividade TIMESTAMP;
    END IF;
END $$;

-- Índice para busca por última atividade
CREATE INDEX IF NOT EXISTS idx_users_ultima_atividade ON users(ultima_atividade DESC);


