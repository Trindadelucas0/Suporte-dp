-- ============================================
-- MIGRATION 011: Permitir status 'pendente' em subscription_status
-- Para suportar novo fluxo: cadastro primeiro, pagamento depois
-- ============================================

-- Não é necessário alterar a coluna, pois VARCHAR(50) já suporta qualquer valor
-- Apenas documentação: subscription_status pode ser:
-- 'ativa' - assinatura ativa e paga
-- 'pendente' - cadastro feito, aguardando pagamento
-- 'inadimplente' - assinatura expirada
-- 'cancelada' - assinatura cancelada

-- Comentário explicativo (se PostgreSQL suportar)
-- COMMENT ON COLUMN users.subscription_status IS 'Status da assinatura: ativa, pendente, inadimplente, cancelada';



