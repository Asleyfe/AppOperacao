-- =====================================================
-- MIGRAÇÃO 45: SISTEMA DE FATURAMENTO SIMPLES COM VIEWS
-- =====================================================
-- Solução simplificada usando VIEWs para detectar automaticamente
-- substituição de transformadores e aplicar valores corretos
-- Data: 2025-01-27
-- Autor: Sistema

-- =====================================================
-- 1. TABELA SIMPLIFICADA DE VALORES
-- =====================================================

CREATE TABLE valores_faturamento_simples (
    id SERIAL PRIMARY KEY,
    grupo text NOT NULL,
    item text NOT NULL DEFAULT 'todos',
    status text NOT NULL CHECK (status IN ('Instalado', 'Retirado')),
    valor_normal numeric(10,2) NOT NULL,
    valor_substituicao numeric(10,2), -- NULL para itens que não têm substituição
    unidade text DEFAULT 'UD',
    ativo boolean DEFAULT true,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Índice único
    UNIQUE(grupo, item, status)
);

-- =====================================================
-- 2. DADOS INICIAIS
-- =====================================================

INSERT INTO valores_faturamento_simples (grupo, item, status, valor_normal, valor_substituicao, observacoes) VALUES
-- Elos fusíveis (sem substituição)
('Elos fusíveis', 'todos', 'Instalado', 65.49, NULL, 'Valor padrão para instalação de elos fusíveis'),
('Elos fusíveis', 'todos', 'Retirado', 55.06, NULL, 'Valor padrão para retirada de elos fusíveis'),

-- Transformadores (com valores diferenciados para substituição)
('TRANSFORMADOR', 'todos', 'Instalado', 850.00, 450.00, 'Instalação: 850 normal / 450 substituição'),
('TRANSFORMADOR', 'todos', 'Retirado', 650.00, 350.00, 'Retirada: 650 normal / 350 substituição'),

-- Cabos BT (sem substituição)
('CABOS BT', 'todos', 'Instalado', 120.00, NULL, 'Valor padrão para instalação de cabos BT'),
('CABOS BT', 'todos', 'Retirado', 80.00, NULL, 'Valor padrão para retirada de cabos BT'),

-- Postes (sem substituição)
('POSTE', 'todos', 'Instalado', 300.00, NULL, 'Valor padrão para instalação de postes'),
('POSTE', 'todos', 'Retirado', 200.00, NULL, 'Valor padrão para retirada de postes'),

-- Chaves e seccionadores (sem substituição)
('CHAVES', 'todos', 'Instalado', 180.00, NULL, 'Valor padrão para instalação de chaves'),
('CHAVES', 'todos', 'Retirado', 120.00, NULL, 'Valor padrão para retirada de chaves');

-- =====================================================
-- 3. VIEW PRINCIPAL - FATURAMENTO AUTOMÁTICO
-- =====================================================

CREATE OR REPLACE VIEW vw_faturamento_automatico AS
WITH servico_contexto AS (
    -- Detecta se é substituição de transformador por serviço
    SELECT DISTINCT
        g.id_servico,
        gi.grupo,
        CASE 
            WHEN gi.grupo = 'TRANSFORMADOR' AND (
                -- Verifica se existe instalação E retirada de transformador no mesmo serviço
                EXISTS(
                    SELECT 1 FROM giservico g2 
                    JOIN grupo_itens gi2 ON g2.id_item = gi2.id 
                    WHERE g2.id_servico = g.id_servico 
                      AND gi2.grupo = 'TRANSFORMADOR' 
                      AND g2.status = 'Instalado'
                )
                AND 
                EXISTS(
                    SELECT 1 FROM giservico g3 
                    JOIN grupo_itens gi3 ON g3.id_item = gi3.id 
                    WHERE g3.id_servico = g.id_servico 
                      AND gi3.grupo = 'TRANSFORMADOR' 
                      AND g3.status = 'Retirado'
                )
            ) THEN true
            ELSE false
        END as eh_substituicao
    FROM giservico g
    JOIN grupo_itens gi ON g.id_item = gi.id
)
SELECT 
    g.id as giservico_id,
    g.id_servico,
    g.id_item,
    gi.grupo,
    gi.item,
    g.status,
    g.quantidade,
    g.n_serie,
    g.prefixo,
    g.created_at,
    
    -- Valor unitário baseado na lógica de substituição
    CASE 
        WHEN COALESCE(sc.eh_substituicao, false) = true AND vf.valor_substituicao IS NOT NULL 
        THEN vf.valor_substituicao
        ELSE vf.valor_normal
    END as valor_unitario,
    
    -- Valor total (valor unitário × quantidade)
    (CASE 
        WHEN COALESCE(sc.eh_substituicao, false) = true AND vf.valor_substituicao IS NOT NULL 
        THEN vf.valor_substituicao
        ELSE vf.valor_normal
    END * COALESCE(g.quantidade, 1)) as valor_total,
    
    vf.unidade,
    COALESCE(sc.eh_substituicao, false) as eh_substituicao,
    
    -- Tipo de operação para exibição
    CASE 
        WHEN COALESCE(sc.eh_substituicao, false) = true AND gi.grupo = 'TRANSFORMADOR'
        THEN 'Substituição'
        ELSE 'Normal'
    END as tipo_operacao
    
FROM giservico g
JOIN grupo_itens gi ON g.id_item = gi.id
LEFT JOIN servico_contexto sc ON (
    g.id_servico = sc.id_servico 
    AND gi.grupo = sc.grupo
)
LEFT JOIN valores_faturamento_simples vf ON (
    vf.grupo = gi.grupo 
    AND (vf.item = gi.item OR vf.item = 'todos')
    AND vf.status = g.status 
    AND vf.ativo = true
)
-- Prioriza valores específicos sobre genéricos
ORDER BY g.id, CASE WHEN vf.item = gi.item THEN 1 ELSE 2 END;

-- =====================================================
-- 4. VIEW RESUMO POR SERVIÇO
-- =====================================================

CREATE OR REPLACE VIEW vw_resumo_faturamento_servico AS
SELECT 
    vfa.id_servico,
    s.descricao as descricao_servico,
    s.equipe_prefixo,
    s.data_planejada,
    s.status as status_servico,
    
    -- Contadores
    COUNT(*) as total_itens,
    SUM(CASE WHEN vfa.status = 'Instalado' THEN vfa.quantidade ELSE 0 END) as qtd_instalados,
    SUM(CASE WHEN vfa.status = 'Retirado' THEN vfa.quantidade ELSE 0 END) as qtd_retirados,
    
    -- Valores financeiros
    SUM(CASE WHEN vfa.status = 'Instalado' THEN vfa.valor_total ELSE 0 END) as valor_instalados,
    SUM(CASE WHEN vfa.status = 'Retirado' THEN vfa.valor_total ELSE 0 END) as valor_retirados,
    SUM(vfa.valor_total) as valor_total_servico,
    
    -- Indicadores especiais
    MAX(CASE WHEN vfa.eh_substituicao THEN 1 ELSE 0 END)::boolean as tem_substituicao_trafo,
    
    -- Grupos de itens presentes
    string_agg(DISTINCT vfa.grupo, ', ' ORDER BY vfa.grupo) as grupos_presentes,
    
    -- Data de cálculo
    CURRENT_TIMESTAMP as calculado_em
    
FROM vw_faturamento_automatico vfa
JOIN servicos s ON vfa.id_servico = s.id
GROUP BY 
    vfa.id_servico, 
    s.descricao, 
    s.equipe_prefixo, 
    s.data_planejada, 
    s.status;

-- =====================================================
-- 5. VIEW RESUMO POR GRUPO
-- =====================================================

CREATE OR REPLACE VIEW vw_resumo_faturamento_grupo AS
SELECT 
    vfa.grupo,
    COUNT(DISTINCT vfa.id_servico) as total_servicos,
    COUNT(*) as total_itens,
    SUM(CASE WHEN vfa.status = 'Instalado' THEN vfa.quantidade ELSE 0 END) as qtd_instalados,
    SUM(CASE WHEN vfa.status = 'Retirado' THEN vfa.quantidade ELSE 0 END) as qtd_retirados,
    SUM(CASE WHEN vfa.status = 'Instalado' THEN vfa.valor_total ELSE 0 END) as valor_instalados,
    SUM(CASE WHEN vfa.status = 'Retirado' THEN vfa.valor_total ELSE 0 END) as valor_retirados,
    SUM(vfa.valor_total) as valor_total_grupo,
    AVG(vfa.valor_unitario) as valor_medio_unitario
FROM vw_faturamento_automatico vfa
GROUP BY vfa.grupo
ORDER BY valor_total_grupo DESC;

-- =====================================================
-- 6. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_valores_faturamento_simples_grupo_status ON valores_faturamento_simples(grupo, status);
CREATE INDEX idx_valores_faturamento_simples_ativo ON valores_faturamento_simples(ativo);

-- =====================================================
-- 7. TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_valores_faturamento_simples_updated_at 
    BEFORE UPDATE ON valores_faturamento_simples 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE valores_faturamento_simples IS 'Tabela simplificada para valores de faturamento com detecção automática de substituição';
COMMENT ON COLUMN valores_faturamento_simples.valor_normal IS 'Valor para operações normais (instalação/retirada simples)';
COMMENT ON COLUMN valores_faturamento_simples.valor_substituicao IS 'Valor para substituições (apenas para transformadores, NULL para outros)';

COMMENT ON VIEW vw_faturamento_automatico IS 'VIEW principal que calcula automaticamente valores baseado no contexto do serviço';
COMMENT ON VIEW vw_resumo_faturamento_servico IS 'Resumo financeiro por serviço com detecção automática de substituições';
COMMENT ON VIEW vw_resumo_faturamento_grupo IS 'Resumo financeiro agrupado por tipo de item/equipamento';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================