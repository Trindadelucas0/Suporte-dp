-- ============================================
-- DADOS INICIAIS DO BANCO DE DADOS
-- ============================================

-- Usuário admin será criado via script: node scripts/create-admin.js
-- Senha padrão: admin123 (será gerado hash bcrypt no script)

-- Feriados nacionais fixos (2024-2025-2026)
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
('2025-12-25', 'Natal', 'nacional'),
('2026-01-01', 'Confraternização Universal', 'nacional'),
('2026-02-16', 'Carnaval', 'facultativo'),
('2026-02-17', 'Carnaval', 'facultativo'),
('2026-02-18', 'Quarta-Feira de Cinzas', 'facultativo'),
('2026-04-03', 'Paixão de Cristo', 'nacional'),
('2026-04-20', 'Ponto Facultativo', 'facultativo'),
('2026-04-21', 'Tiradentes', 'nacional'),
('2026-05-01', 'Dia Mundial do Trabalho', 'nacional'),
('2026-06-04', 'Corpus Christi', 'facultativo'),
('2026-06-05', 'Ponto Facultativo', 'facultativo'),
('2026-09-07', 'Independência do Brasil', 'nacional'),
('2026-10-12', 'Nossa Senhora Aparecida', 'nacional'),
('2026-10-28', 'Dia do Servidor Público Federal', 'facultativo'),
('2026-11-02', 'Finados', 'nacional'),
('2026-11-15', 'Proclamação da República', 'nacional'),
('2026-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'),
('2026-12-24', 'Véspera do Natal', 'facultativo'),
('2026-12-25', 'Natal', 'nacional'),
('2026-12-31', 'Véspera do Ano Novo', 'facultativo')
ON CONFLICT (data) DO NOTHING;

