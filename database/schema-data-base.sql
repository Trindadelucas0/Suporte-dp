-- ============================================
-- TABELA: calculos_data_base (Histórico de cálculos de Multa da Data Base)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_data_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_base DATE NOT NULL,
    data_rescisao DATE NOT NULL,
    salario_base DECIMAL(10,2) NOT NULL,
    valor_medias DECIMAL(10,2) DEFAULT 0,
    base_calculo DECIMAL(10,2) NOT NULL,
    esta_no_risco BOOLEAN NOT NULL,
    valor_multa DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_data_base_user ON calculos_data_base(user_id, created_at DESC);

-- ============================================
-- TABELA: calculos_contrato_experiencia (Histórico de cálculos de quebra de contrato)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_contrato_experiencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim_previsto DATE NOT NULL,
    data_encerramento DATE NOT NULL,
    salario_base DECIMAL(10,2) NOT NULL,
    valor_medias DECIMAL(10,2) DEFAULT 0,
    quebrado_pelo_empregador BOOLEAN NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_contrato_user ON calculos_contrato_experiencia(user_id, created_at DESC);


