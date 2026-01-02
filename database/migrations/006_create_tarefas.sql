-- ============================================
-- MIGRATION: 006_create_tarefas.sql
-- Sistema de Controle de Tarefas
-- ============================================

-- Criar tabela tarefas
CREATE TABLE IF NOT EXISTS tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'nao_iniciado',
    prioridade VARCHAR(10) NOT NULL DEFAULT 'media',
    data_vencimento DATE NOT NULL,
    data_conclusao DATE,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_status CHECK (status IN ('nao_iniciado', 'em_andamento', 'feito')),
    CONSTRAINT check_prioridade CHECK (prioridade IN ('alta', 'media', 'baixa')),
    CONSTRAINT check_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_tarefas_user_status ON tarefas(user_id, status, ordem);
CREATE INDEX IF NOT EXISTS idx_tarefas_user_data ON tarefas(user_id, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefas_user_prioridade ON tarefas(user_id, prioridade, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status) WHERE status != 'feito';

-- Criar trigger para atualizar updated_at (se função existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_tarefas_updated_at 
            BEFORE UPDATE ON tarefas
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Função para preencher data_conclusao automaticamente
CREATE OR REPLACE FUNCTION set_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'feito' AND (OLD.status != 'feito' OR OLD.status IS NULL) THEN
        NEW.data_conclusao = CURRENT_DATE;
    ELSIF NEW.status != 'feito' AND OLD.status = 'feito' THEN
        NEW.data_conclusao = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para data_conclusao
CREATE TRIGGER trigger_set_data_conclusao
    BEFORE UPDATE ON tarefas
    FOR EACH ROW
    EXECUTE FUNCTION set_data_conclusao();

-- Estender tabela notificacoes (se campo não existir)
ALTER TABLE notificacoes 
ADD COLUMN IF NOT EXISTS tarefa_id UUID REFERENCES tarefas(id) ON DELETE SET NULL;

-- Índice para notificações relacionadas a tarefas
CREATE INDEX IF NOT EXISTS idx_notificacoes_tarefa ON notificacoes(tarefa_id) WHERE tarefa_id IS NOT NULL;

