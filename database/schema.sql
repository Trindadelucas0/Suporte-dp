-- ============================================
-- SCHEMA DO BANCO DE DADOS - SUPORTE DP
-- Sistema de Cálculos Trabalhistas
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users (Usuários do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida por email
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- TABELA: feriados (Feriados nacionais e regionais)
-- ============================================
CREATE TABLE IF NOT EXISTS feriados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data DATE NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'nacional', -- nacional, estadual, municipal
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca por data
CREATE INDEX idx_feriados_data ON feriados(data);

-- ============================================
-- TABELA: calendario_anotacoes (Anotações do calendário)
-- ============================================
CREATE TABLE IF NOT EXISTS calendario_anotacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    anotacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, data)
);

-- Índice para busca por usuário e data
CREATE INDEX idx_calendario_user_data ON calendario_anotacoes(user_id, data);

-- ============================================
-- TABELA: calendario_obrigacoes (Obrigações fiscais e trabalhistas)
-- ============================================
CREATE TABLE IF NOT EXISTS calendario_obrigacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- dctfweb, inss, irrf, fgts, eSocial, etc.
    descricao VARCHAR(255) NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca por usuário e data
CREATE INDEX idx_calendario_obrigacoes_user_data ON calendario_obrigacoes(user_id, data);
CREATE INDEX idx_calendario_obrigacoes_tipo ON calendario_obrigacoes(tipo);

-- ============================================
-- TABELA: calculos_inss (Histórico de cálculos de INSS)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_inss (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salario_bruto DECIMAL(10,2) NOT NULL,
    pro_labore BOOLEAN DEFAULT FALSE,
    valor_inss DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_inss_user ON calculos_inss(user_id, created_at DESC);

-- ============================================
-- TABELA: calculos_irrf (Histórico de cálculos de IRRF)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_irrf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salario_bruto DECIMAL(10,2) NOT NULL,
    valor_inss DECIMAL(10,2) NOT NULL,
    dependentes INTEGER DEFAULT 0,
    pensao_alimenticia DECIMAL(10,2) DEFAULT 0,
    base_calculo DECIMAL(10,2) NOT NULL,
    aliquota DECIMAL(5,2) NOT NULL,
    valor_irrf DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_irrf_user ON calculos_irrf(user_id, created_at DESC);

-- ============================================
-- TABELA: calculos_fgts (Histórico de cálculos de FGTS)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_fgts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salario_bruto DECIMAL(10,2) NOT NULL,
    tipo_registro VARCHAR(50) NOT NULL, -- clt_geral, jovem_aprendiz, domestico
    percentual_fgts DECIMAL(5,2) NOT NULL,
    valor_fgts DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_fgts_user ON calculos_fgts(user_id, created_at DESC);

-- ============================================
-- TABELA: calculos_avos (Histórico de cálculos de avos)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_avos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_admissao DATE NOT NULL,
    data_referencia DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- ferias, decimo_terceiro
    avos INTEGER NOT NULL,
    valor DECIMAL(10,2),
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_avos_user ON calculos_avos(user_id, created_at DESC);

-- ============================================
-- TABELA: calculos_periculosidade (Histórico de cálculos de periculosidade/insalubridade)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_periculosidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL, -- periculosidade, insalubridade
    salario_base DECIMAL(10,2) NOT NULL,
    percentual DECIMAL(5,2) NOT NULL,
    valor_adicional DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_periculosidade_user ON calculos_periculosidade(user_id, created_at DESC);

-- ============================================
-- TABELA: calculos_custo (Histórico de cálculos de custo total)
-- ============================================
CREATE TABLE IF NOT EXISTS calculos_custo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salario_bruto DECIMAL(10,2) NOT NULL,
    valor_ferias DECIMAL(10,2) DEFAULT 0,
    valor_decimo_terceiro DECIMAL(10,2) DEFAULT 0,
    valor_fgts DECIMAL(10,2) DEFAULT 0,
    valor_encargos DECIMAL(10,2) DEFAULT 0,
    valor_beneficios DECIMAL(10,2) DEFAULT 0,
    custo_mensal DECIMAL(10,2) NOT NULL,
    custo_anual DECIMAL(10,2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para histórico do usuário
CREATE INDEX idx_calculos_custo_user ON calculos_custo(user_id, created_at DESC);

-- ============================================
-- TABELA: checklists (Checklists de processos)
-- ============================================
CREATE TABLE IF NOT EXISTS checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- admissao, rescisao
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    concluido BOOLEAN DEFAULT FALSE,
    data_vencimento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca por usuário e tipo
CREATE INDEX idx_checklists_user_tipo ON checklists(user_id, tipo);

-- ============================================
-- TABELA: checklist_itens (Itens dos checklists)
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL,
    concluido BOOLEAN DEFAULT FALSE,
    observacao TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para ordenação
CREATE INDEX idx_checklist_itens_ordem ON checklist_itens(checklist_id, ordem);

-- ============================================
-- TABELA: notificacoes (Notificações do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- info, warning, success, error
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para notificações não lidas
CREATE INDEX idx_notificacoes_user_lida ON notificacoes(user_id, lida, created_at DESC);

-- ============================================
-- TABELA: sessions (Sessões do Express - criada pelo connect-pg-simple)
-- ============================================
-- Esta tabela será criada automaticamente pelo connect-pg-simple
-- Mas podemos criar manualmente se necessário:
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- ============================================
-- TRIGGERS: Atualização automática de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendario_anotacoes_updated_at BEFORE UPDATE ON calendario_anotacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_itens_updated_at BEFORE UPDATE ON checklist_itens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
CREATE INDEX IF NOT EXISTS idx_calculos_data_base_user ON calculos_data_base(user_id, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_calculos_contrato_user ON calculos_contrato_experiencia(user_id, created_at DESC);

