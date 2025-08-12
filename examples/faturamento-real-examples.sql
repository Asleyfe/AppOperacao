-- Exemplos de consultas SQL para o sistema de faturamento com dados reais
-- Baseado na migração 46_populate_faturamento_dados_reais.sql

-- =====================================================
-- 1. CONSULTAS BÁSICAS DE FATURAMENTO
-- =====================================================

-- Faturamento detalhado de um serviço específico
SELECT 
    numero_servico,
    equipe,
    data_servico,
    grupo,
    item,
    status,
    quantidade,
    valor_unitario,
    valor_total,
    eh_substituicao_trafo,
    tipo_servico,
    observacoes
FROM vw_faturamento_real 
WHERE numero_servico = '2024001'
ORDER BY grupo, item;

-- Resumo financeiro de um serviço
SELECT 
    numero_servico,
    equipe,
    data_servico,
    total_itens,
    valor_total_servico,
    valor_substituicoes,
    valor_outros
FROM vw_resumo_faturamento_real 
WHERE numero_servico = '2024001';

-- =====================================================
-- 2. ANÁLISES POR EQUIPE
-- =====================================================

-- Faturamento por equipe em um período
SELECT 
    equipe,
    COUNT(*) as total_servicos,
    SUM(valor_total_servico) as valor_total,
    AVG(valor_total_servico) as valor_medio_servico,
    SUM(valor_substituicoes) as total_substituicoes,
    SUM(valor_outros) as total_outros
FROM vw_resumo_faturamento_real 
WHERE data_servico BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY equipe
ORDER BY valor_total DESC;

-- Ranking de equipes por faturamento mensal
SELECT 
    equipe,
    EXTRACT(MONTH FROM data_servico::date) as mes,
    COUNT(*) as servicos_mes,
    SUM(valor_total_servico) as faturamento_mes
FROM vw_resumo_faturamento_real 
WHERE EXTRACT(YEAR FROM data_servico::date) = 2024
GROUP BY equipe, EXTRACT(MONTH FROM data_servico::date)
ORDER BY mes, faturamento_mes DESC;

-- =====================================================
-- 3. ANÁLISES POR TIPO DE EQUIPAMENTO
-- =====================================================

-- Resumo por grupo de equipamentos
SELECT 
    grupo,
    total_itens,
    quantidade_total,
    valor_total_grupo,
    valor_medio_unitario
FROM vw_resumo_faturamento_grupo_real
ORDER BY valor_total_grupo DESC;

-- Faturamento detalhado por tipo de transformador
SELECT 
    item,
    status,
    tipo_servico,
    COUNT(*) as quantidade_servicos,
    SUM(quantidade) as quantidade_total,
    AVG(valor_unitario) as valor_medio,
    SUM(valor_total) as valor_total
FROM vw_faturamento_real 
WHERE grupo = 'TRAFOS'
GROUP BY item, status, tipo_servico
ORDER BY valor_total DESC;

-- =====================================================
-- 4. ANÁLISES DE SUBSTITUIÇÃO DE TRANSFORMADORES
-- =====================================================

-- Serviços com substituição de transformadores (sem aparelhagem)
SELECT 
    numero_servico,
    equipe,
    data_servico,
    item,
    SUM(CASE WHEN status = 'Instalado' THEN valor_total ELSE 0 END) as valor_instalacao,
    SUM(CASE WHEN status = 'Retirado' THEN valor_total ELSE 0 END) as valor_retirada,
    SUM(valor_total) as valor_total_substituicao,
    CASE 
        WHEN item LIKE '%C/APARELHAGEM%' THEN 'Com Aparelhagem'
        ELSE 'Sem Aparelhagem'
    END as tipo_trafo
FROM vw_faturamento_real
WHERE eh_substituicao_trafo = true
GROUP BY numero_servico, equipe, data_servico, item
ORDER BY valor_total_substituicao DESC;

-- Comparação: valores para diferentes tipos de transformadores
SELECT 
    item,
    status,
    valor_unitario,
    observacoes,
    CASE 
        WHEN item LIKE '%C/APARELHAGEM%' THEN 'Com Aparelhagem'
        WHEN observacoes = 'substituição' THEN 'Substituição (sem aparelhagem)'
        ELSE 'Normal (sem aparelhagem)'
    END as tipo_operacao
FROM valores_faturamento_real
WHERE grupo = 'TRAFOS'
ORDER BY 
    CASE WHEN item LIKE '%MONO%' THEN 1 WHEN item LIKE '%BI%' THEN 2 ELSE 3 END,
    item, 
    status, 
    tipo_operacao;

-- =====================================================
-- 5. RELATÓRIOS FINANCEIROS
-- =====================================================

-- Faturamento mensal consolidado
SELECT 
    EXTRACT(YEAR FROM data_servico::date) as ano,
    EXTRACT(MONTH FROM data_servico::date) as mes,
    COUNT(DISTINCT numero_servico) as total_servicos,
    COUNT(DISTINCT equipe) as total_equipes,
    SUM(valor_total_servico) as faturamento_total,
    AVG(valor_total_servico) as faturamento_medio
FROM vw_resumo_faturamento_real 
GROUP BY EXTRACT(YEAR FROM data_servico::date), EXTRACT(MONTH FROM data_servico::date)
ORDER BY ano DESC, mes DESC;

-- Top 10 serviços com maior faturamento
SELECT 
    numero_servico,
    equipe,
    data_servico,
    total_itens,
    valor_total_servico
FROM vw_resumo_faturamento_real 
ORDER BY valor_total_servico DESC
LIMIT 10;

-- =====================================================
-- 6. VERIFICAÇÕES E AUDITORIA
-- =====================================================

-- Itens de serviço sem valor de faturamento cadastrado
SELECT DISTINCT
    g.grupo,
    g.item,
    g.status,
    COUNT(*) as ocorrencias
FROM giservico g
LEFT JOIN valores_faturamento_real vf ON (
    vf.grupo = g.grupo 
    AND vf.item = g.item 
    AND vf.status = g.status
)
WHERE vf.id IS NULL
GROUP BY g.grupo, g.item, g.status
ORDER BY ocorrencias DESC;

-- Verificar consistência de valores para transformadores
SELECT 
    item,
    status,
    tipo_servico,
    valor_unitario,
    observacoes
FROM valores_faturamento_real 
WHERE grupo = 'TRAFOS'
ORDER BY item, status, valor_unitario;

-- =====================================================
-- 7. ANÁLISES AVANÇADAS
-- =====================================================

-- Evolução do faturamento por equipe ao longo do tempo
WITH faturamento_mensal AS (
    SELECT 
        equipe,
        DATE_TRUNC('month', data_servico::date) as mes,
        SUM(valor_total_servico) as faturamento_mes
    FROM vw_resumo_faturamento_real 
    GROUP BY equipe, DATE_TRUNC('month', data_servico::date)
)
SELECT 
    equipe,
    mes,
    faturamento_mes,
    LAG(faturamento_mes) OVER (PARTITION BY equipe ORDER BY mes) as faturamento_mes_anterior,
    CASE 
        WHEN LAG(faturamento_mes) OVER (PARTITION BY equipe ORDER BY mes) IS NOT NULL 
        THEN ROUND(((faturamento_mes - LAG(faturamento_mes) OVER (PARTITION BY equipe ORDER BY mes)) / LAG(faturamento_mes) OVER (PARTITION BY equipe ORDER BY mes) * 100), 2)
        ELSE NULL
    END as variacao_percentual
FROM faturamento_mensal
ORDER BY equipe, mes;

-- Análise de produtividade: faturamento por item instalado/retirado
SELECT 
    grupo,
    status,
    COUNT(*) as total_operacoes,
    SUM(quantidade) as quantidade_total,
    SUM(valor_total) as valor_total,
    AVG(valor_unitario) as valor_medio_unitario,
    SUM(valor_total) / SUM(quantidade) as valor_medio_por_unidade
FROM vw_faturamento_real 
GROUP BY grupo, status
ORDER BY valor_total DESC;

-- =====================================================
-- 8. CONSULTAS PARA DASHBOARDS
-- =====================================================

-- KPIs principais para dashboard
SELECT 
    COUNT(DISTINCT numero_servico) as total_servicos,
    COUNT(DISTINCT equipe) as total_equipes,
    SUM(valor_total_servico) as faturamento_total,
    AVG(valor_total_servico) as faturamento_medio_servico,
    SUM(CASE WHEN valor_substituicoes > 0 THEN 1 ELSE 0 END) as servicos_com_substituicao
FROM vw_resumo_faturamento_real;

-- Distribuição de faturamento por faixa de valor
WITH faixas AS (
    SELECT 
        numero_servico,
        valor_total_servico,
        CASE 
            WHEN valor_total_servico < 1000 THEN 'Até R$ 1.000'
            WHEN valor_total_servico < 5000 THEN 'R$ 1.001 - R$ 5.000'
            WHEN valor_total_servico < 10000 THEN 'R$ 5.001 - R$ 10.000'
            WHEN valor_total_servico < 20000 THEN 'R$ 10.001 - R$ 20.000'
            ELSE 'Acima de R$ 20.000'
        END as faixa_valor
    FROM vw_resumo_faturamento_real
)
SELECT 
    faixa_valor,
    COUNT(*) as quantidade_servicos,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM faixas
GROUP BY faixa_valor
ORDER BY MIN(CASE 
    WHEN faixa_valor = 'Até R$ 1.000' THEN 1
    WHEN faixa_valor = 'R$ 1.001 - R$ 5.000' THEN 2
    WHEN faixa_valor = 'R$ 5.001 - R$ 10.000' THEN 3
    WHEN faixa_valor = 'R$ 10.001 - R$ 20.000' THEN 4
    ELSE 5
END);

-- =====================================================
-- 9. CONSULTAS DE MANUTENÇÃO
-- =====================================================

-- Atualizar valor de um item específico
-- UPDATE valores_faturamento_real 
-- SET valor_unitario = 1200.00 
-- WHERE grupo = 'TRAFOS' AND item = 'TRAFO 10KVA 13,8KV 127V MONO' AND status = 'Instalado' AND tipo_servico = 'mono s/amparelhagem substituição';

-- Inserir novo valor de faturamento
-- INSERT INTO valores_faturamento_real (grupo, item, status, valor_unitario, unidade, tipo_servico, observacoes)
-- VALUES ('NOVO_GRUPO', 'NOVO_ITEM', 'Instalado', 500.00, 'UD', NULL, 'Novo equipamento cadastrado');

-- Verificar integridade dos dados
SELECT 
    'Valores duplicados' as verificacao,
    COUNT(*) as problemas
FROM (
    SELECT grupo, item, status, tipo_servico, COUNT(*)
    FROM valores_faturamento_real 
    GROUP BY grupo, item, status, COALESCE(tipo_servico, '')
    HAVING COUNT(*) > 1
) duplicados

UNION ALL

SELECT 
    'Valores zerados' as verificacao,
    COUNT(*) as problemas
FROM valores_faturamento_real 
WHERE valor_unitario <= 0;

-- =====================================================
-- 10. FUNÇÕES AUXILIARES (OPCIONAL)
-- =====================================================

-- Função para calcular faturamento de um serviço específico
-- CREATE OR REPLACE FUNCTION calcular_faturamento_servico(p_numero_servico TEXT)
-- RETURNS TABLE(
--     numero_servico TEXT,
--     valor_total DECIMAL(10,2),
--     total_itens INTEGER
-- ) AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT 
--         r.numero_servico,
--         r.valor_total_servico,
--         r.total_itens
--     FROM vw_resumo_faturamento_real r
--     WHERE r.numero_servico = p_numero_servico;
-- END;
-- $$ LANGUAGE plpgsql;

-- Exemplo de uso da função:
-- SELECT * FROM calcular_faturamento_servico('2024001');

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

/*
Este arquivo contém exemplos práticos de como utilizar o sistema de faturamento
com dados reais. As consultas estão organizadas por categoria de uso:

1. Consultas básicas - Para operações do dia a dia
2. Análises por equipe - Para gestão de equipes
3. Análises por equipamento - Para controle de materiais
4. Substituições - Para casos especiais de transformadores
5. Relatórios financeiros - Para gestão financeira
6. Verificações - Para auditoria e qualidade dos dados
7. Análises avançadas - Para insights estratégicos
8. Dashboards - Para visualizações
9. Manutenção - Para administração do sistema
10. Funções auxiliares - Para automação

Para usar no aplicativo TypeScript, importe o serviço:
import FaturamentoRealService from './services/faturamento-real';

Exemplos de uso:
- const faturamento = await FaturamentoRealService.getFaturamentoPorServico('2024001');
- const resumo = await FaturamentoRealService.getResumoFaturamentoServico('2024001');
- const ranking = await FaturamentoRealService.getRankingEquipes('2024-01-01', '2024-12-31');
*/