-- =====================================================
-- MIGRAÇÃO 44: CRIAÇÃO DE TABELAS PARA FATURAMENTO
-- Data: Janeiro 2025
-- Objetivo: Implementar sistema de faturamento baseado em itens executados
-- =====================================================

-- Tabela: valores_faturamento
-- Armazena os valores de faturamento por grupo, item e status
CREATE TABLE valores_faturamento (
    id integer NOT NULL DEFAULT nextval('valores_faturamento_id_seq'::regclass),
    grupo text NOT NULL,
    item text NOT NULL,
    status text NOT NULL CHECK (status IN ('Instalado', 'Retirado')),
    tipo_servico text NOT NULL DEFAULT 'Normal' CHECK (tipo_servico IN ('Normal', 'Substituição', 'Com_Aparelhagem', 'Sem_Aparelhagem')),
    valor_unitario numeric(10,2) NOT NULL,
    unidade text,
    ativo boolean NOT NULL DEFAULT true,
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT valores_faturamento_pkey PRIMARY KEY (id),
    CONSTRAINT valores_faturamento_unique_grupo_item_status UNIQUE (grupo, item, status, tipo_servico)
);

-- Criar sequência para a tabela valores_faturamento
CREATE SEQUENCE valores_faturamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Tabela: faturamento_servicos
-- Armazena o resumo de faturamento por serviço
CREATE TABLE faturamento_servicos (
    id integer NOT NULL DEFAULT nextval('faturamento_servicos_id_seq'::regclass),
    servico_id integer NOT NULL,
    equipe_prefixo character varying(10),
    data_execucao date,
    valor_total_instalado numeric(12,2) DEFAULT 0,
    valor_total_retirado numeric(12,2) DEFAULT 0,
    valor_total_geral numeric(12,2) DEFAULT 0,
    quantidade_itens_instalados integer DEFAULT 0,
    quantidade_itens_retirados integer DEFAULT 0,
    quantidade_itens_total integer DEFAULT 0,
    status_faturamento text DEFAULT 'Pendente' CHECK (status_faturamento IN ('Pendente', 'Calculado', 'Faturado')),
    observacoes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT faturamento_servicos_pkey PRIMARY KEY (id),
    CONSTRAINT faturamento_servicos_servico_unique UNIQUE (servico_id)
);

-- Criar sequência para a tabela faturamento_servicos
CREATE SEQUENCE faturamento_servicos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Tabela: detalhes_faturamento
-- Armazena os detalhes de faturamento por item executado
CREATE TABLE detalhes_faturamento (
    id integer NOT NULL DEFAULT nextval('detalhes_faturamento_id_seq'::regclass),
    faturamento_servico_id integer NOT NULL,
    giservico_id integer NOT NULL,
    grupo text NOT NULL,
    item text NOT NULL,
    status text NOT NULL,
    quantidade integer NOT NULL DEFAULT 1,
    valor_unitario numeric(10,2) NOT NULL,
    valor_total numeric(12,2) NOT NULL,
    unidade text,
    n_serie text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT detalhes_faturamento_pkey PRIMARY KEY (id)
);

-- Criar sequência para a tabela detalhes_faturamento
CREATE SEQUENCE detalhes_faturamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- =====================================================
-- CHAVES ESTRANGEIRAS
-- =====================================================

-- Relacionamento faturamento_servicos -> servicos
ALTER TABLE faturamento_servicos
ADD CONSTRAINT fk_faturamento_servicos_servico_id
FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE;

-- Relacionamento detalhes_faturamento -> faturamento_servicos
ALTER TABLE detalhes_faturamento
ADD CONSTRAINT fk_detalhes_faturamento_servico_id
FOREIGN KEY (faturamento_servico_id) REFERENCES faturamento_servicos(id) ON DELETE CASCADE;

-- Relacionamento detalhes_faturamento -> giservico
ALTER TABLE detalhes_faturamento
ADD CONSTRAINT fk_detalhes_faturamento_giservico_id
FOREIGN KEY (giservico_id) REFERENCES giservico(id) ON DELETE CASCADE;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para valores_faturamento
CREATE INDEX idx_valores_faturamento_grupo ON valores_faturamento(grupo);
CREATE INDEX idx_valores_faturamento_status ON valores_faturamento(status);
CREATE INDEX idx_valores_faturamento_ativo ON valores_faturamento(ativo);

-- Índices para faturamento_servicos
CREATE INDEX idx_faturamento_servicos_equipe ON faturamento_servicos(equipe_prefixo);
CREATE INDEX idx_faturamento_servicos_data ON faturamento_servicos(data_execucao);
CREATE INDEX idx_faturamento_servicos_status ON faturamento_servicos(status_faturamento);

-- Índices para detalhes_faturamento
CREATE INDEX idx_detalhes_faturamento_grupo ON detalhes_faturamento(grupo);
CREATE INDEX idx_detalhes_faturamento_status ON detalhes_faturamento(status);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at em valores_faturamento
CREATE OR REPLACE FUNCTION update_valores_faturamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_valores_faturamento_updated_at
    BEFORE UPDATE ON valores_faturamento
    FOR EACH ROW
    EXECUTE FUNCTION update_valores_faturamento_updated_at();

-- Trigger para atualizar updated_at em faturamento_servicos
CREATE OR REPLACE FUNCTION update_faturamento_servicos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_faturamento_servicos_updated_at
    BEFORE UPDATE ON faturamento_servicos
    FOR EACH ROW
    EXECUTE FUNCTION update_faturamento_servicos_updated_at();

-- =====================================================
-- DADOS INICIAIS DE EXEMPLO
-- =====================================================

-- Inserir valores de exemplo baseados na planilha mencionada
INSERT INTO valores_faturamento (grupo, item, status, tipo_servico, valor_unitario, unidade, observacoes) VALUES
-- Elos fusíveis - valores normais
('Elos fusíveis', 'todos', 'Instalado', 'Normal', 65.49, 'UD', 'Valor padrão para instalação de elos fusíveis'),
('Elos fusíveis', 'todos', 'Retirado', 'Normal', 55.06, 'UD', 'Valor padrão para retirada de elos fusíveis'),

-- Transformadores - valores com aparelhagem (instalação/retirada completa)
('TRANSFORMADOR', 'todos', 'Instalado', 'Com_Aparelhagem', 850.00, 'UD', 'Instalação de transformador com toda aparelhagem'),
('TRANSFORMADOR', 'todos', 'Retirado', 'Com_Aparelhagem', 650.00, 'UD', 'Retirada de transformador com toda aparelhagem'),

-- Transformadores - valores para substituição (sem aparelhagem)
('TRANSFORMADOR', 'todos', 'Instalado', 'Substituição', 450.00, 'UD', 'Substituição de transformador - apenas o equipamento'),
('TRANSFORMADOR', 'todos', 'Retirado', 'Substituição', 350.00, 'UD', 'Retirada para substituição - apenas o equipamento');

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE valores_faturamento IS 'Tabela que armazena os valores de faturamento por grupo, item e status (Instalado/Retirado)';
COMMENT ON TABLE faturamento_servicos IS 'Tabela que armazena o resumo de faturamento por serviço executado';
COMMENT ON TABLE detalhes_faturamento IS 'Tabela que armazena os detalhes de faturamento por item executado no serviço';

COMMENT ON COLUMN valores_faturamento.grupo IS 'Grupo do item (ex: Elos fusíveis, POSTE, TRANSFORMADOR)';
COMMENT ON COLUMN valores_faturamento.item IS 'Item específico ou "todos" para aplicar a todos os itens do grupo';
COMMENT ON COLUMN valores_faturamento.status IS 'Status da execução: Instalado ou Retirado';
COMMENT ON COLUMN valores_faturamento.valor_unitario IS 'Valor unitário em reais para o item/grupo/status';
COMMENT ON COLUMN valores_faturamento.ativo IS 'Indica se o valor está ativo para cálculos';

COMMENT ON COLUMN faturamento_servicos.servico_id IS 'ID do serviço relacionado';
COMMENT ON COLUMN faturamento_servicos.valor_total_geral IS 'Valor total do serviço (instalado + retirado)';
COMMENT ON COLUMN faturamento_servicos.status_faturamento IS 'Status do faturamento: Pendente, Calculado ou Faturado';

-- =====================================================
-- STATUS FINAL
-- =====================================================

-- Verificar se as tabelas foram criadas com sucesso
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('valores_faturamento', 'faturamento_servicos', 'detalhes_faturamento')
ORDER BY tablename;

-- Verificar se as sequências foram criadas
SELECT 
    sequence_name,
    start_value,
    increment_by
FROM information_schema.sequences 
WHERE sequence_name LIKE '%faturamento%'
ORDER BY sequence_name;

SELECT 'Migração 44 concluída com sucesso - Tabelas de faturamento criadas' AS status;