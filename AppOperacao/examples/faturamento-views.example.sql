-- =====================================================
-- EXEMPLOS DE USO DAS VIEWS DE FATURAMENTO SIMPLES
-- =====================================================
-- Este arquivo contém exemplos práticos de como usar
-- as VIEWs criadas para consultar dados de faturamento
-- Data: 2025-01-27

-- =====================================================
-- 1. CONSULTAR FATURAMENTO DETALHADO DE UM SERVIÇO
-- =====================================================

-- Exemplo: Ver todos os itens e valores de um serviço específico
SELECT 
    grupo,
    item,
    status,
    quantidade,
    valor_unitario,
    valor_total,
    tipo_operacao,
    eh_substituicao
FROM vw_faturamento_automatico 
WHERE id_servico = 123
ORDER BY grupo, status;

-- =====================================================
-- 2. RESUMO FINANCEIRO DE UM SERVIÇO
-- =====================================================

-- Exemplo: Resumo completo de faturamento por serviço
SELECT 
    id_servico,
    descricao_servico,
    equipe_prefixo,
    data_planejada,
    total_itens,
    qtd_instalados,
    qtd_retirados,
    valor_instalados,
    valor_retirados,
    valor_total_servico,
    tem_substituicao_trafo,
    grupos_presentes
FROM vw_resumo_faturamento_servico 
WHERE id_servico = 123;

-- =====================================================
-- 3. FATURAMENTO POR EQUIPE EM UM PERÍODO
-- =====================================================

-- Exemplo: Faturamento de uma equipe em janeiro de 2025
SELECT 
    equipe_prefixo,
    COUNT(*) as total_servicos,
    SUM(valor_total_servico) as valor_total_equipe,
    AVG(valor_total_servico) as valor_medio_por_servico,
    SUM(qtd_instalados) as total_instalados,
    SUM(qtd_retirados) as total_retirados
FROM vw_resumo_faturamento_servico 
WHERE data_planejada BETWEEN '2025-01-01' AND '2025-01-31'
  AND equipe_prefixo = 'EQ001'
GROUP BY equipe_prefixo;

-- =====================================================
-- 4. RANKING DE EQUIPES POR FATURAMENTO
-- =====================================================

-- Exemplo: Top 10 equipes por faturamento no mês
SELECT 
    equipe_prefixo,
    COUNT(*) as total_servicos,
    SUM(valor_total_servico) as valor_total_equipe,
    AVG(valor_total_servico) as valor_medio_por_servico
FROM vw_resumo_faturamento_servico 
WHERE data_planejada >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY equipe_prefixo
ORDER BY valor_total_equipe DESC
LIMIT 10;

-- =====================================================
-- 5. ANÁLISE POR TIPO DE EQUIPAMENTO
-- =====================================================

-- Exemplo: Faturamento por grupo de equipamentos
SELECT 
    grupo,
    total_servicos,
    total_itens,
    qtd_instalados,
    qtd_retirados,
    valor_total_grupo,
    valor_medio_unitario
FROM vw_resumo_faturamento_grupo
ORDER BY valor_total_grupo DESC;

-- =====================================================
-- 6. DETECTAR SUBSTITUIÇÕES DE TRANSFORMADORES
-- =====================================================

-- Exemplo: Serviços com substituição de transformador
SELECT 
    id_servico,
    descricao_servico,
    equipe_prefixo,
    data_planejada,
    valor_total_servico
FROM vw_resumo_faturamento_servico 
WHERE tem_substituicao_trafo = true
ORDER BY data_planejada DESC;

-- =====================================================
-- 7. COMPARAR VALORES NORMAL VS SUBSTITUIÇÃO
-- =====================================================

-- Exemplo: Ver diferença de valores para transformadores
SELECT 
    id_servico,
    grupo,
    item,
    status,
    quantidade,
    valor_unitario,
    valor_total,
    tipo_operacao,
    CASE 
        WHEN eh_substituicao THEN 'Valor de substituição aplicado'
        ELSE 'Valor normal aplicado'
    END as observacao
FROM vw_faturamento_automatico 
WHERE grupo = 'TRANSFORMADOR'
ORDER BY id_servico, status;

-- =====================================================
-- 8. FATURAMENTO MENSAL CONSOLIDADO
-- =====================================================

-- Exemplo: Consolidado mensal por equipe
SELECT 
    DATE_TRUNC('month', data_planejada) as mes,
    equipe_prefixo,
    COUNT(*) as total_servicos,
    SUM(valor_total_servico) as valor_total_mes,
    SUM(qtd_instalados) as total_instalados,
    SUM(qtd_retirados) as total_retirados,
    COUNT(CASE WHEN tem_substituicao_trafo THEN 1 END) as servicos_com_substituicao
FROM vw_resumo_faturamento_servico 
WHERE data_planejada >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', data_planejada), equipe_prefixo
ORDER BY mes DESC, valor_total_mes DESC;

-- =====================================================
-- 9. VERIFICAR ITENS SEM VALOR CADASTRADO
-- =====================================================

-- Exemplo: Identificar itens que não têm valor de faturamento
SELECT DISTINCT
    gi.grupo,
    gi.item,
    g.status,
    COUNT(*) as ocorrencias
FROM giservico g
JOIN grupo_itens gi ON g.id_item = gi.id
LEFT JOIN valores_faturamento_simples vf ON (
    vf.grupo = gi.grupo 
    AND (vf.item = gi.item OR vf.item = 'todos')
    AND vf.status = g.status 
    AND vf.ativo = true
)
WHERE vf.id IS NULL
GROUP BY gi.grupo, gi.item, g.status
ORDER BY gi.grupo, gi.item, g.status;

-- =====================================================
-- 10. ATUALIZAR VALORES DE FATURAMENTO
-- =====================================================

-- Exemplo: Como atualizar um valor específico
-- UPDATE valores_faturamento_simples 
-- SET valor_normal = 900.00, 
--     valor_substituicao = 500.00,
--     observacoes = 'Valor atualizado em ' || CURRENT_DATE
-- WHERE grupo = 'TRANSFORMADOR' 
--   AND item = 'todos' 
--   AND status = 'Instalado';

-- Exemplo: Como adicionar novo grupo de itens
-- INSERT INTO valores_faturamento_simples (grupo, item, status, valor_normal, observacoes) VALUES
-- ('MEDIDORES', 'todos', 'Instalado', 150.00, 'Valor para instalação de medidores'),
-- ('MEDIDORES', 'todos', 'Retirado', 100.00, 'Valor para retirada de medidores');

-- =====================================================
-- 11. CONSULTA PARA APLICATIVO MOBILE
-- =====================================================

-- Exemplo: Dados simplificados para exibir no app
SELECT 
    'Serviço: ' || id_servico as titulo,
    'Equipe: ' || equipe_prefixo as subtitulo,
    'R$ ' || ROUND(valor_total_servico, 2) as valor_formatado,
    total_itens || ' itens' as detalhes,
    CASE 
        WHEN tem_substituicao_trafo THEN 'Com substituição de trafo'
        ELSE 'Operação normal'
    END as tipo_servico
FROM vw_resumo_faturamento_servico 
WHERE data_planejada >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY data_planejada DESC
LIMIT 20;

-- =====================================================
-- FIM DOS EXEMPLOS
-- =====================================================