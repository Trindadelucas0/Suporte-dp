-- ============================================
-- MIGRATION: Refatoração da Calculadora de Risco Multa
-- ============================================
-- Remove campos de cálculo (salário, médias, valores)
-- Adiciona campos de sindicato, negociação e aviso prévio

-- 1. Criar nova tabela com estrutura atualizada
CREATE TABLE IF NOT EXISTS calculos_risco_multa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados do Sindicato
    nome_sindicato VARCHAR(255),
    cnpj_sindicato VARCHAR(18),
    
    -- Dados do Contrato
    data_base DATE NOT NULL,
    data_rescisao DATE NOT NULL,
    
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

-- Índice para histórico do usuário
CREATE INDEX IF NOT EXISTS idx_calculos_risco_multa_user ON calculos_risco_multa(user_id, created_at DESC);

-- Índice para busca por data base
CREATE INDEX IF NOT EXISTS idx_calculos_risco_multa_data_base ON calculos_risco_multa(data_base);

-- 2. Migrar dados existentes (se houver) - apenas dados básicos
-- Nota: Dados antigos não terão informações de sindicato e aviso prévio
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calculos_data_base') THEN
        INSERT INTO calculos_risco_multa (
            user_id,
            data_base,
            data_rescisao,
            esta_no_periodo_risco,
            gera_multa,
            tipo_aviso_previo,
            created_at
        )
        SELECT 
            user_id,
            data_base,
            data_rescisao,
            esta_no_risco,
            esta_no_risco, -- Se estava no risco, gera multa
            'nao_aplicavel',
            created_at
        FROM calculos_data_base
        WHERE NOT EXISTS (
            SELECT 1 FROM calculos_risco_multa 
            WHERE calculos_risco_multa.user_id = calculos_data_base.user_id 
            AND calculos_risco_multa.data_base = calculos_data_base.data_base
            AND calculos_risco_multa.data_rescisao = calculos_data_base.data_rescisao
        );
    END IF;
END $$;

-- 3. Comentários para documentação
COMMENT ON TABLE calculos_risco_multa IS 'Histórico de análises de risco de multa da data base';
COMMENT ON COLUMN calculos_risco_multa.nome_sindicato IS 'Nome do sindicato envolvido';
COMMENT ON COLUMN calculos_risco_multa.cnpj_sindicato IS 'CNPJ do sindicato';
COMMENT ON COLUMN calculos_risco_multa.data_base IS 'Data base do contrato';
COMMENT ON COLUMN calculos_risco_multa.data_rescisao IS 'Data da rescisão';
COMMENT ON COLUMN calculos_risco_multa.houve_negociacao IS 'Indica se houve negociação do período de risco';
COMMENT ON COLUMN calculos_risco_multa.periodo_negociado IS 'Descrição do período negociado';
COMMENT ON COLUMN calculos_risco_multa.tipo_aviso_previo IS 'Tipo de aviso prévio: trabalhado, indenizado ou não aplicável';
COMMENT ON COLUMN calculos_risco_multa.data_inicio_aviso_previo IS 'Data de início do aviso prévio';
COMMENT ON COLUMN calculos_risco_multa.data_fim_aviso_previo IS 'Data de fim do aviso prévio';
COMMENT ON COLUMN calculos_risco_multa.esta_no_periodo_risco IS 'Indica se a rescisão está no período de risco (30 dias após data base)';
COMMENT ON COLUMN calculos_risco_multa.aviso_previo_gera_multa IS 'Indica se o aviso prévio cai nos 30 dias que antecedem a multa';
COMMENT ON COLUMN calculos_risco_multa.gera_multa IS 'Resultado final: se gera multa ou não';




