-- ============================================
-- DADOS INICIAIS DO BANCO DE DADOS
-- ============================================

-- Usuário admin será criado via script: node scripts/create-admin.js
-- Senha padrão: admin123 (será gerado hash bcrypt no script)

-- Feriados nacionais fixos (2024-2025)
INSERT INTO feriados (data, nome, tipo) VALUES
('2024-01-01', 'Confraternização Universal', 'nacional'),
('2024-02-12', 'Carnaval', 'nacional'),
('2024-02-13', 'Carnaval', 'nacional'),
('2024-03-29', 'Sexta-feira Santa', 'nacional'),
('2024-04-21', 'Tiradentes', 'nacional'),
('2024-05-01', 'Dia do Trabalhador', 'nacional'),
('2024-06-20', 'Corpus Christi', 'nacional'),
('2024-09-07', 'Independência do Brasil', 'nacional'),
('2024-10-12', 'Nossa Senhora Aparecida', 'nacional'),
('2024-11-02', 'Finados', 'nacional'),
('2024-11-15', 'Proclamação da República', 'nacional'),
('2024-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
('2024-12-25', 'Natal', 'nacional'),
('2025-01-01', 'Confraternização Universal', 'nacional'),
('2025-02-17', 'Carnaval', 'nacional'),
('2025-02-18', 'Carnaval', 'nacional'),
('2025-04-18', 'Sexta-feira Santa', 'nacional'),
('2025-04-21', 'Tiradentes', 'nacional'),
('2025-05-01', 'Dia do Trabalhador', 'nacional'),
('2025-06-19', 'Corpus Christi', 'nacional'),
('2025-09-07', 'Independência do Brasil', 'nacional'),
('2025-10-12', 'Nossa Senhora Aparecida', 'nacional'),
('2025-11-02', 'Finados', 'nacional'),
('2025-11-15', 'Proclamação da República', 'nacional'),
('2025-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
('2025-12-25', 'Natal', 'nacional')
ON CONFLICT (data) DO NOTHING;

