# Solução Simples de Faturamento com VIEW

## Conceito
Usar uma VIEW que detecta automaticamente o tipo de serviço baseado na lógica:
- **Transformadores**: Se há instalação E retirada no mesmo serviço = Substituição
- **Outros itens**: Sempre valor padrão (1=1)

## Implementação

### 1. Tabela Simplificada de Valores
```sql
-- Tabela mais simples - apenas 3 colunas principais
CREATE TABLE valores_faturamento_simples (
    id SERIAL PRIMARY KEY,
    grupo text NOT NULL,
    item text NOT NULL DEFAULT 'todos',
    status text NOT NULL CHECK (status IN ('Instalado', 'Retirado')),
    valor_normal numeric(10,2) NOT NULL,
    valor_substituicao numeric(10,2),
    unidade text DEFAULT 'UD',
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Dados de exemplo
INSERT INTO valores_faturamento_simples (grupo, status, valor_normal, valor_substituicao) VALUES
('Elos fusíveis', 'Instalado', 65.49, NULL),
('Elos fusíveis', 'Retirado', 55.06, NULL),
('TRANSFORMADOR', 'Instalado', 850.00, 450.00),
('TRANSFORMADOR', 'Retirado', 650.00, 350.00),
('CABOS BT', 'Instalado', 120.00, NULL),
('CABOS BT', 'Retirado', 80.00, NULL),
('POSTE', 'Instalado', 300.00, NULL),
('POSTE', 'Retirado', 200.00, NULL);
```

### 2. VIEW Inteligente para Faturamento
```sql
CREATE OR REPLACE VIEW vw_faturamento_automatico AS
WITH servico_contexto AS (
    -- Detecta se é substituição de transformador
    SELECT 
        g.id_servico,
        gi.grupo,
        CASE 
            WHEN gi.grupo = 'TRANSFORMADOR' AND (
                EXISTS(SELECT 1 FROM giservico g2 JOIN grupo_itens gi2 ON g2.id_item = gi2.id 
                       WHERE g2.id_servico = g.id_servico AND gi2.grupo = 'TRANSFORMADOR' AND g2.status = 'Instalado')
                AND 
                EXISTS(SELECT 1 FROM giservico g3 JOIN grupo_itens gi3 ON g3.id_item = gi3.id 
                       WHERE g3.id_servico = g.id_servico AND gi3.grupo = 'TRANSFORMADOR' AND g3.status = 'Retirado')
            ) THEN true
            ELSE false
        END as eh_substituicao
    FROM giservico g
    JOIN grupo_itens gi ON g.id_item = gi.id
    GROUP BY g.id_servico, gi.grupo
)
SELECT 
    g.id,
    g.id_servico,
    g.id_item,
    gi.grupo,
    gi.item,
    g.status,
    g.quantidade,
    g.n_serie,
    g.prefixo,
    g.created_at,
    -- Valor unitário baseado na lógica
    CASE 
        WHEN sc.eh_substituicao AND vf.valor_substituicao IS NOT NULL 
        THEN vf.valor_substituicao
        ELSE vf.valor_normal
    END as valor_unitario,
    -- Valor total
    (CASE 
        WHEN sc.eh_substituicao AND vf.valor_substituicao IS NOT NULL 
        THEN vf.valor_substituicao
        ELSE vf.valor_normal
    END * g.quantidade) as valor_total,
    vf.unidade,
    sc.eh_substituicao
FROM giservico g
JOIN grupo_itens gi ON g.id_item = gi.id
LEFT JOIN servico_contexto sc ON g.id_servico = sc.id_servico AND gi.grupo = sc.grupo
LEFT JOIN valores_faturamento_simples vf ON (
    vf.grupo = gi.grupo 
    AND vf.status = g.status 
    AND vf.ativo = true
);
```

### 3. VIEW para Resumo por Serviço
```sql
CREATE OR REPLACE VIEW vw_resumo_faturamento_servico AS
SELECT 
    vfa.id_servico,
    s.descricao as descricao_servico,
    s.equipe_prefixo,
    s.data_planejada,
    COUNT(*) as total_itens,
    SUM(CASE WHEN vfa.status = 'Instalado' THEN vfa.quantidade ELSE 0 END) as qtd_instalados,
    SUM(CASE WHEN vfa.status = 'Retirado' THEN vfa.quantidade ELSE 0 END) as qtd_retirados,
    SUM(CASE WHEN vfa.status = 'Instalado' THEN vfa.valor_total ELSE 0 END) as valor_instalados,
    SUM(CASE WHEN vfa.status = 'Retirado' THEN vfa.valor_total ELSE 0 END) as valor_retirados,
    SUM(vfa.valor_total) as valor_total_servico,
    -- Indica se tem substituição de transformador
    MAX(CASE WHEN vfa.eh_substituicao THEN 1 ELSE 0 END)::boolean as tem_substituicao_trafo
FROM vw_faturamento_automatico vfa
JOIN servicos s ON vfa.id_servico = s.id
GROUP BY vfa.id_servico, s.descricao, s.equipe_prefixo, s.data_planejada;
```

### 4. Consultas Simples

#### Faturamento de um Serviço Específico
```sql
SELECT * FROM vw_resumo_faturamento_servico WHERE id_servico = 3;
```

#### Detalhes dos Itens Faturados
```sql
SELECT 
    grupo,
    item,
    status,
    quantidade,
    valor_unitario,
    valor_total,
    CASE WHEN eh_substituicao THEN 'Substituição' ELSE 'Normal' END as tipo_operacao
FROM vw_faturamento_automatico 
WHERE id_servico = 3
ORDER BY grupo, item, status;
```

#### Relatório por Período
```sql
SELECT 
    DATE_TRUNC('month', data_planejada) as mes,
    equipe_prefixo,
    COUNT(*) as total_servicos,
    SUM(valor_total_servico) as valor_total_mes,
    SUM(qtd_instalados) as total_instalados,
    SUM(qtd_retirados) as total_retirados
FROM vw_resumo_faturamento_servico
WHERE data_planejada >= '2025-01-01'
GROUP BY DATE_TRUNC('month', data_planejada), equipe_prefixo
ORDER BY mes DESC, equipe_prefixo;
```

## Vantagens desta Solução

1. **Simplicidade**: Não precisa modificar tabela `giservico`
2. **Automática**: Detecta substituição automaticamente
3. **Flexível**: Fácil de ajustar regras na VIEW
4. **Performance**: VIEWs são otimizadas pelo PostgreSQL
5. **Manutenção**: Apenas uma tabela de valores para manter

## Como Usar no App

```typescript
// Buscar faturamento de um serviço
const { data } = await supabase
  .from('vw_resumo_faturamento_servico')
  .select('*')
  .eq('id_servico', servicoId)
  .single();

// Buscar detalhes dos itens
const { data: detalhes } = await supabase
  .from('vw_faturamento_automatico')
  .select('*')
  .eq('id_servico', servicoId);
```

## Exemplo Prático

### Cenário: Serviço com Substituição de Transformador
```
GIServico:
- Transformador 15kVA, Retirado, Qtd: 1
- Transformador 25kVA, Instalado, Qtd: 1
- Elo fusível, Instalado, Qtd: 3
```

### Resultado da VIEW:
```
Transformador 15kVA | Retirado  | 1 | 350.00 | 350.00 | Substituição
Transformador 25kVA | Instalado | 1 | 450.00 | 450.00 | Substituição  
Elo fusível         | Instalado | 3 |  65.49 | 196.47 | Normal
                                    TOTAL: 996.47
```

**Resumo**: Detecção automática, valores corretos aplicados, sem complexidade adicional!