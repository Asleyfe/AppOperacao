-- Dados de teste para a equipe 856011A
-- Execute este script no Supabase para criar dados de teste

-- 1. Inserir equipe 856011A se não existir
INSERT INTO equipes (prefixo, data, status_composicao, tipo_equipe, encarregado_matricula)
VALUES ('856011A', '2025-01-15', 'Ativa', 'LV', 12345)
ON CONFLICT (prefixo, data) DO NOTHING;

-- 2. Inserir serviços de teste para a equipe 856011A
INSERT INTO servicos (nota, equipe_prefixo, data_planejada, descricao, status)
VALUES 
('2025001', '856011A', '2025-01-15', 'Instalação de transformador 10KVA', 'Concluído'),
('2025002', '856011A', '2025-01-15', 'Substituição de elo fusível', 'Concluído'),
('2025003', '856011A', '2025-01-15', 'Instalação de chave fusível', 'Concluído');

-- 3. Inserir itens GI para os serviços (assumindo que os serviços foram criados com IDs sequenciais)
-- Você precisará ajustar os IDs dos serviços conforme necessário

-- Para o serviço de transformador (assumindo ID do serviço = último ID + 1)
INSERT INTO giservico (id_servico, id_item, status, prefixo, quantidade)
SELECT 
    s.id,
    gi.id,
    'Instalado',
    '856011A',
    1
FROM servicos s
CROSS JOIN grupo_itens gi
WHERE s.nota = '2025001' 
  AND s.equipe_prefixo = '856011A'
  AND gi.grupo = 'TRAFOS' 
  AND gi.item = 'TRAFO 10KVA 13,8KV 127V MONO';

-- Para o serviço de elo fusível
INSERT INTO giservico (id_servico, id_item, status, prefixo, quantidade)
SELECT 
    s.id,
    gi.id,
    'Instalado',
    '856011A',
    2
FROM servicos s
CROSS JOIN grupo_itens gi
WHERE s.nota = '2025002' 
  AND s.equipe_prefixo = '856011A'
  AND gi.grupo = 'ELO FUSIVEL' 
  AND gi.item = '5H';

-- Para o serviço de chave fusível
INSERT INTO giservico (id_servico, id_item, status, prefixo, quantidade)
SELECT 
    s.id,
    gi.id,
    'Instalado',
    '856011A',
    1
FROM servicos s
CROSS JOIN grupo_itens gi
WHERE s.nota = '2025003' 
  AND s.equipe_prefixo = '856011A'
  AND gi.grupo = 'CHAVES' 
  AND gi.item = 'CHAVE FUSÍVEL 13,8KV';

-- 4. Verificar se os dados foram inseridos corretamente
SELECT 'Verificação dos dados inseridos:' as status;

SELECT 
    'Serviços da equipe 856011A:' as tipo,
    COUNT(*) as quantidade
FROM servicos 
WHERE equipe_prefixo = '856011A';

SELECT 
    'Itens GI da equipe 856011A:' as tipo,
    COUNT(*) as quantidade
FROM giservico 
WHERE prefixo = '856011A';

-- 5. Verificar faturamento calculado
SELECT 
    'Faturamento da equipe 856011A:' as tipo,
    COUNT(*) as registros,
    SUM(valor_total) as valor_total
FROM vw_faturamento_real 
WHERE equipe = '856011A';

SELECT 
    'Resumo faturamento da equipe 856011A:' as tipo,
    COUNT(*) as registros,
    SUM(valor_total_servico) as valor_total
FROM vw_resumo_faturamento_real 
WHERE equipe = '856011A';