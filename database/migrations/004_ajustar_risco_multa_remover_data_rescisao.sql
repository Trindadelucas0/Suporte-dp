-- ============================================
-- MIGRATION: Ajustar tabela calculos_risco_multa
-- ============================================
-- Remove obrigatoriedade de data_rescisao (não é mais usada)
-- Ajusta campos que não são mais necessários

-- 1. Tornar data_rescisao opcional (NULL permitido)
ALTER TABLE calculos_risco_multa 
ALTER COLUMN data_rescisao DROP NOT NULL;

-- 2. Se a tabela não existir ainda, criar com estrutura correta
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calculos_risco_multa') THEN
        CREATE TABLE calculos_risco_multa (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            
            -- Dados do Sindicato
            nome_sindicato VARCHAR(255),
            cnpj_sindicato VARCHAR(18),
            
            -- Dados do Contrato
            data_base DATE NOT NULL,
            data_rescisao DATE, -- Opcional (não é mais usada)
            
            -- Negociação de Período de Risco
            houve_negociacao BOOLEAN DEFAULT FALSE,
            periodo_negociado TEXT,
            
            -- Aviso Prévio
            tipo_aviso_previo VARCHAR(20) CHECK (tipo_aviso_previo IN ('trabalhado', 'indenizado', 'nao_aplicavel')),
            data_inicio_aviso_previo DATE,
            data_fim_aviso_previo DATE,
            
            -- Análise e Resultado
            esta_no_periodo_risco BOOLEAN,
            aviso_previo_gera_multa BOOLEAN,
            gera_multa BOOLEAN,
            
            -- Informações Adicionais (JSONB para flexibilidade)
            dados_adicionais JSONB,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Índices
        CREATE INDEX IF NOT EXISTS idx_calculos_risco_multa_user ON calculos_risco_multa(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_calculos_risco_multa_data_base ON calculos_risco_multa(data_base);
    END IF;
END $$;

-- 3. Comentários atualizados
COMMENT ON TABLE calculos_risco_multa IS 'Histórico de análises de risco de multa da data base';
COMMENT ON COLUMN calculos_risco_multa.data_rescisao IS 'Data da rescisão (opcional - não é mais usada no cálculo)';




