-- Migração para popular a tabela de faturamento com dados reais
-- Baseado no arquivo dados-valor

-- Criar tabela de faturamento com estrutura adequada
CREATE TABLE IF NOT EXISTS valores_faturamento_real (
    id SERIAL PRIMARY KEY,
    grupo VARCHAR(100) NOT NULL,
    item VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Instalado', 'Retirado')),
    valor_unitario DECIMAL(10,2) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UD',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_valores_faturamento_real_unique 
ON valores_faturamento_real (grupo, item, status, observacoes);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_valores_faturamento_real_updated_at 
    BEFORE UPDATE ON valores_faturamento_real 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de faturamento baseados no arquivo dados-valor
INSERT INTO valores_faturamento_real (grupo, item, valor_unitario, status, unidade, observacoes) VALUES
-- ISOLADOR
('ISOLADOR', 'ISOLADOR PINO 13,8KV', 65.49, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 13,8KV', 55.06, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 34,5KV', 65.49, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 34,5KV', 55.06, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR ROLDANA 13,8KV', 65.49, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR ROLDANA 13,8KV', 55.06, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR ROLDANA 34,5KV', 65.49, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR ROLDANA 34,5KV', 55.06, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 13,8KV', 65.49, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 13,8KV', 55.06, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 34,5KV', 65.49, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 34,5KV', 55.06, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 15KV', 49.32, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 15KV', 34.52, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 36KV', 49.32, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR PINO 36KV', 34.52, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 15KV', 49.32, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 15KV', 34.52, 'Retirado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 36KV', 49.32, 'Instalado', 'UD', ''),
('ISOLADOR', 'ISOLADOR SUSP 36KV', 34.52, 'Retirado', 'UD', '')

-- PARA RAIO
('PARA RAIO', 'PARA-RAIO NA REDE 13,8KV', 131.04, 'Instalado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NA REDE 13,8KV', 81.26, 'Retirado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NA REDE 34,5KV', 131.04, 'Instalado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NA REDE 34,5KV', 81.26, 'Retirado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NO TRAFO 13,8KV', 131.04, 'Instalado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NO TRAFO 13,8KV', 81.26, 'Retirado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NO TRAFO 34,5KV', 131.04, 'Instalado', 'UD', ''),
('PARA RAIO', 'PARA-RAIO NO TRAFO 34,5KV', 81.26, 'Retirado', 'UD', '')

-- CABOS MT
('CABOS MT', '4 AWG', 7.16, 'Instalado', 'M', ''),
('CABOS MT', '4 AWG', 3.49, 'Retirado', 'M', ''),
('CABOS MT', '2 AWG', 8.38, 'Instalado', 'M', ''),
('CABOS MT', '2 AWG', 3.49, 'Retirado', 'M', ''),
('CABOS MT', '336.4 MCM', 9.16, 'Instalado', 'M', ''),
('CABOS MT', '336.4 MCM', 3.49, 'Retirado', 'M', ''),
('CABOS MT', '1/0 AWG', 11.4, 'Instalado', 'M', ''),
('CABOS MT', '1/0 AWG', 3.49, 'Retirado', 'M', ''),
('CABOS MT', '2/0 AWG', 3.49, 'Instalado', 'M', ''),
('CABOS MT', '2/0 AWG', 3.49, 'Retirado', 'M', ''),
('CABOS MT', '4/0 AWG', 6.54, 'Instalado', 'M', ''),
('CABOS MT', '4/0 AWG', 3.49, 'Retirado', 'M', ''),

-- CABOS BT
('CABOS BT', 'CABO 4AWG AL', 16.37, 'Instalado', 'M', ''),
('CABOS BT', 'CABO 4AWG AL', 11.86, 'Retirado', 'M', ''),
('CABOS BT', 'CABO 2AWG AL', 16.37, 'Instalado', 'M', ''),
('CABOS BT', 'CABO 2AWG AL', 11.86, 'Retirado', 'M', ''),
('CABOS BT', 'CABO 1/0AWG AL', 16.37, 'Instalado', 'M', ''),
('CABOS BT', 'CABO 1/0AWG AL', 11.86, 'Retirado', 'M', ''),
('CABOS BT', 'CABO 2/0AWG AL', 16.37, 'Instalado', 'M', ''),
('CABOS BT', 'CABO 2/0AWG AL', 11.86, 'Retirado', 'M', ''),
('CABOS BT', 'CABO 4/0AWG AL', 16.37, 'Instalado', 'M', ''),
('CABOS BT', 'CABO 4/0AWG AL', 11.86, 'Retirado', 'M', ''),
('CABOS BT', 'CABO 336,4MCM AL', 16.37, 'Instalado', 'M', ''),
('CABOS BT', 'CABO 336,4MCM AL', 11.86, 'Retirado', 'M', ''),

-- ESTRUTURAS PRIMARIAS COMPACTA
('ESTRUTURAS PRIMARIAS COMPACTA', 'C1', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C1', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C2', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C2', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C3', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C3', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C4', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C4', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C5', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C5', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C6', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS COMPACTA', 'C6', 493.5, 'Retirado', 'UD', ''),

-- ESTRUTURAS PRIMARIAS CONVENCIONAL
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N1', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N1', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N2', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N2', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N3', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N3', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N4', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N4', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N5', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N5', 493.5, 'Retirado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N6', 493.5, 'Instalado', 'UD', ''),
('ESTRUTURAS PRIMARIAS CONVENCIONAL', 'N6', 493.5, 'Retirado', 'UD', ''),

-- TRAFOS - Transformadores (valores diferenciados por aparelhagem no nome do item)
-- Monofásicos
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V MONO', 897.13, 'Instalado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V MONO', 627.99, 'Retirado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 13,8KV 220V MONO', 897.13, 'Instalado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 13,8KV 220V MONO', 627.99, 'Retirado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 34,5KV 127V MONO', 897.13, 'Instalado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 34,5KV 127V MONO', 627.99, 'Retirado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 34,5KV 220V MONO', 897.13, 'Instalado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 34,5KV 220V MONO', 627.99, 'Retirado', 'UD', 'substituição'),

-- Monofásicos com aparelhagem
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V MONO C/APARELHAGEM', 1560.17, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V MONO C/APARELHAGEM', 1092.12, 'Retirado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 13,8KV 220V MONO C/APARELHAGEM', 1560.17, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 13,8KV 220V MONO C/APARELHAGEM', 1092.12, 'Retirado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 34,5KV 127V MONO C/APARELHAGEM', 1560.17, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 34,5KV 127V MONO C/APARELHAGEM', 1092.12, 'Retirado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 34,5KV 220V MONO C/APARELHAGEM', 1560.17, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 34,5KV 220V MONO C/APARELHAGEM', 1092.12, 'Retirado', 'UD', ''),

-- Bifásicos
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V BI', 1146.78, 'Instalado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V BI', 802.75, 'Retirado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 15KVA 13,8KV 127V BI', 1146.78, 'Instalado', 'UD', 'substituição'),
('TRAFOS', 'TRAFO 15KVA 13,8KV 127V BI', 802.75, 'Retirado', 'UD', 'substituição'),

-- Bifásicos com aparelhagem
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V BI C/APARELHAGEM', 1867.02, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V BI C/APARELHAGEM', 1306.91, 'Retirado', 'UD', ''),
('TRAFOS', 'TRAFO 15KVA 13,8KV 127V BI C/APARELHAGEM', 1867.02, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 15KVA 13,8KV 127V BI C/APARELHAGEM', 1306.91, 'Retirado', 'UD', ''),

-- Trifásicos
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V TRI', 2246.54, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V TRI', 1758.16, 'Retirado', 'UD', ''),
('TRAFOS', 'TRAFO 75KVA 13,8KV 127V TRI', 2246.54, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 75KVA 13,8KV 127V TRI', 1758.16, 'Retirado', 'UD', ''),

-- Trifásicos com aparelhagem
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V TRI C/APARELHAGEM', 3140.63, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 10KVA 13,8KV 127V TRI C/APARELHAGEM', 2198.42, 'Retirado', 'UD', ''),
('TRAFOS', 'TRAFO 75KVA 13,8KV 127V TRI C/APARELHAGEM', 3140.63, 'Instalado', 'UD', ''),
('TRAFOS', 'TRAFO 75KVA 13,8KV 127V TRI C/APARELHAGEM', 2198.42, 'Retirado', 'UD', ''),

-- CHAVES
('CHAVES', 'CHAVE FUSÍVEL 13,8KV', 462.75, 'Instalado', 'UD', ''),
('CHAVES', 'CHAVE FUSÍVEL 13,8KV', 346.21, 'Retirado', 'UD', ''),
('CHAVES', 'CHAVE FUSÍVEL 34,5KV', 462.75, 'Instalado', 'UD', ''),
('CHAVES', 'CHAVE FUSÍVEL 34,5KV', 346.21, 'Retirado', 'UD', ''),
('CHAVES', 'CHAVE SECCIONADORA FACA 13,8KV', 194.38, 'Instalado', 'UD', ''),
('CHAVES', 'CHAVE SECCIONADORA FACA 13,8KV', 140.81, 'Retirado', 'UD', ''),
('CHAVES', 'CHAVE SECCIONADORA FACA 34,5KV', 194.38, 'Instalado', 'UD', ''),
('CHAVES', 'CHAVE SECCIONADORA FACA 34,5KV', 140.81, 'Retirado', 'UD', ''),
('CHAVES', 'CHAVES LAMINA 13,8KV', 462.75, 'Instalado', 'UD', ''),
('CHAVES', 'CHAVES LAMINA 13,8KV', 346.21, 'Retirado', 'UD', ''),
('CHAVES', 'CHAVES LAMINA 34,5KV', 462.75, 'Instalado', 'UD', ''),
('CHAVES', 'CHAVES LAMINA 34,5KV', 346.21, 'Retirado', 'UD', ''),

-- ELO FUSIVEL
('ELO FUSIVEL', '1H', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '1H', 55.06, 'Retirado', 'UD', ''),
('ELO FUSIVEL', '2H', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '2H', 55.06, 'Retirado', 'UD', ''),
('ELO FUSIVEL', '3H', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '3H', 55.06, 'Retirado', 'UD', ''),
('ELO FUSIVEL', '5H', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '5H', 55.06, 'Retirado', 'UD', ''),
('ELO FUSIVEL', '6K', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '6K', 55.06, 'Retirado', 'UD', ''),
('ELO FUSIVEL', '8K', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '8K', 55.06, 'Retirado', 'UD', ''),
('ELO FUSIVEL', '10K', 65.49, 'Instalado', 'UD', ''),
('ELO FUSIVEL', '10K', 55.06, 'Retirado', 'UD', ''),

-- ESTRUTURAS SECUNDARIAS
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-1', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-1', 246.8, 'Retirado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-2', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-2', 246.8, 'Retirado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-3', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-3', 246.8, 'Retirado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-4', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA', 'SI-4', 246.8, 'Retirado', 'UD', ''),

('ESTRUTURAS SECUNDARIAS RD NUA', 'S1.4', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S1.4', 246.8, 'Retirado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S2.4', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S2.4', 246.8, 'Retirado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S3.4', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S3.4', 246.8, 'Retirado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S4.4', 246.8, 'Instalado', 'UD', ''),
('ESTRUTURAS SECUNDARIAS RD NUA', 'S4.4', 246.8, 'Retirado', 'UD', '');

-- View principal para cálculo de faturamento (simplificada)
CREATE OR REPLACE VIEW vw_faturamento_real AS
SELECT 
    g.id as giservico_id,
    g.id_servico,
    s.id as servico_id,
    e.prefixo as equipe,
    s.data_planejada as data_servico,
    gi.grupo,
    gi.item,
    g.status,
    g.quantidade,
    g.n_serie,
    vf.valor_unitario,
    vf.unidade,
    vf.observacoes as valor_obs,
    -- Calcula valor total
    (g.quantidade * COALESCE(vf.valor_unitario, 0)) as valor_total,
    -- Indica se o item tem valor cadastrado
    CASE WHEN vf.valor_unitario IS NOT NULL THEN true ELSE false END as tem_valor_cadastrado
FROM giservico g
JOIN grupo_itens gi ON g.id_item = gi.id
JOIN servicos s ON g.id_servico = s.id
JOIN equipes e ON s.equipe_id = e.id
LEFT JOIN valores_faturamento_real vf ON (
    gi.grupo = vf.grupo 
    AND gi.item = vf.item 
    AND g.status = vf.status
)
ORDER BY g.id_servico, gi.grupo, gi.item, g.status;

-- VIEW para resumo de faturamento por serviço
CREATE OR REPLACE VIEW vw_resumo_faturamento_real AS
SELECT 
    servico_id,
    id_servico,
    equipe,
    data_servico,
    COUNT(*) as total_itens,
    SUM(valor_total) as valor_total_servico,
    COUNT(CASE WHEN NOT tem_valor_cadastrado THEN 1 END) as itens_sem_valor
FROM vw_faturamento_real
GROUP BY servico_id, id_servico, equipe, data_servico
ORDER BY data_servico DESC;

-- VIEW para resumo por grupo de equipamentos
CREATE OR REPLACE VIEW vw_resumo_faturamento_grupo_real AS
SELECT 
    grupo,
    COUNT(*) as total_itens,
    SUM(quantidade) as quantidade_total,
    SUM(valor_total) as valor_total_grupo,
    AVG(valor_unitario) as valor_medio_unitario
FROM vw_faturamento_real
GROUP BY grupo
ORDER BY valor_total_grupo DESC;

COMMIT;