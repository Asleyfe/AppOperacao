-- =============================================
-- SCHEMA ATUALIZADO DO BANCO DE DADOS
-- Gerado automaticamente em: 2025-01-27
-- =============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELAS PRINCIPAIS
-- =============================================

-- Tabela: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    funcao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    matricula INTEGER UNIQUE NOT NULL,
    user_id UUID UNIQUE REFERENCES auth.users(id),
    supervisor_id INTEGER REFERENCES colaboradores(id),
    coordenador_id INTEGER REFERENCES colaboradores(id)
);

-- Tabela: equipes
CREATE TABLE IF NOT EXISTS equipes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    prefixo CHARACTER VARYING(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    tipo_equipe TEXT NOT NULL,
    status_composicao TEXT DEFAULT 'Pendente' NOT NULL,
    encarregado_matricula INTEGER REFERENCES colaboradores(matricula),
    
    -- Constraints
    CONSTRAINT check_tipo_equipe CHECK (tipo_equipe = ANY (ARRAY['Manutenção'::text, 'Construção'::text, 'Operação'::text])),
    CONSTRAINT equipes_status_composicao_check CHECK (status_composicao = ANY (ARRAY['Pendente'::text, 'Completa'::text, 'Incompleta'::text]))
);

-- Tabela: composicao_equipe
CREATE TABLE IF NOT EXISTS composicao_equipe (
    id SERIAL PRIMARY KEY,
    equipe_id INTEGER NOT NULL REFERENCES equipes(id),
    colaborador_matricula INTEGER NOT NULL REFERENCES colaboradores(matricula),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraint única
    CONSTRAINT composicao_equipe_equipe_id_colaborador_matricula_key UNIQUE (equipe_id, colaborador_matricula)
);

-- Tabela: grupo_itens
CREATE TABLE IF NOT EXISTS grupo_itens (
    id SERIAL PRIMARY KEY,
    grupo TEXT NOT NULL,
    item TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    descricao TEXT
);

-- Tabela: servicos
CREATE TABLE IF NOT EXISTS servicos (
    id TEXT PRIMARY KEY,
    equipe_id INTEGER REFERENCES equipes(id),
    data_planejada DATE NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'Planejado' NOT NULL,
    inicio_deslocamento TIMESTAMP WITH TIME ZONE,
    fim_deslocamento TIMESTAMP WITH TIME ZONE,
    inicio_execucao TIMESTAMP WITH TIME ZONE,
    fim_execucao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    equipe_prefixo CHARACTER VARYING(10),
    nota TEXT
);

-- Tabela: giservico
CREATE TABLE IF NOT EXISTS giservico (
    id SERIAL PRIMARY KEY,
    id_servico TEXT NOT NULL REFERENCES servicos(id),
    id_item INTEGER NOT NULL REFERENCES grupo_itens(id),
    quantidade INTEGER NOT NULL,
    status TEXT NOT NULL,
    n_serie TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    prefixo CHARACTER VARYING(10) REFERENCES equipes(prefixo),
    
    -- Constraint de status
    CONSTRAINT giservico_status_check CHECK (status = ANY (ARRAY['Executado'::text, 'Não Executado'::text, 'Parcialmente Executado'::text]))
);

-- Tabela: execucoes_colaborador
CREATE TABLE IF NOT EXISTS execucoes_colaborador (
    id SERIAL PRIMARY KEY,
    servico_id TEXT NOT NULL REFERENCES servicos(id),
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
    equipe_id INTEGER NOT NULL REFERENCES equipes(id),
    data_execucao DATE NOT NULL,
    inicio_deslocamento TIMESTAMP WITH TIME ZONE,
    fim_deslocamento TIMESTAMP WITH TIME ZONE,
    inicio_execucao TIMESTAMP WITH TIME ZONE,
    fim_execucao TIMESTAMP WITH TIME ZONE,
    status_participacao TEXT DEFAULT 'Presente' NOT NULL,
    observacoes TEXT,
    avaliacao_qualidade INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT execucoes_colaborador_servico_id_colaborador_id_key UNIQUE (servico_id, colaborador_id),
    CONSTRAINT execucoes_colaborador_status_participacao_check CHECK (status_participacao = ANY (ARRAY['Presente'::text, 'Ausente'::text, 'Atestado'::text, 'Férias'::text])),
    CONSTRAINT execucoes_colaborador_avaliacao_qualidade_check CHECK ((avaliacao_qualidade >= 1) AND (avaliacao_qualidade <= 5))
);

-- Tabela: historico_turno
CREATE TABLE IF NOT EXISTS historico_turno (
    id SERIAL PRIMARY KEY,
    colaborador_matricula INTEGER NOT NULL REFERENCES colaboradores(matricula),
    equipe_prefixo CHARACTER VARYING(10) NOT NULL REFERENCES equipes(prefixo),
    data_turno DATE NOT NULL,
    turno TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela: servico_header
CREATE TABLE IF NOT EXISTS servico_header (
    id SERIAL PRIMARY KEY,
    equipe_prefixo CHARACTER VARYING(10) NOT NULL,
    data_servico DATE NOT NULL,
    turno TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela: valores_faturamento_real
CREATE TABLE IF NOT EXISTS valores_faturamento_real (
    id SERIAL PRIMARY KEY,
    grupo TEXT NOT NULL,
    item TEXT NOT NULL,
    status TEXT NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    unidade TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para auto-geração de ID de serviços
CREATE OR REPLACE FUNCTION auto_generate_servico_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se ID não foi fornecido, gerar automaticamente
    IF NEW.id IS NULL THEN
        NEW.id := generate_servico_id(NEW.nota, NEW.equipe_prefixo);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_servico_id
    BEFORE INSERT ON servicos
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_servico_id();

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para gerar ID de serviço
CREATE OR REPLACE FUNCTION generate_servico_id(nota_param TEXT, equipe_prefixo_param TEXT)
RETURNS TEXT AS $$
DECLARE
    next_sequence INTEGER;
    new_id TEXT;
BEGIN
    -- Buscar o próximo número sequencial para esta combinação
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(
                id FROM '.*-([0-9]+)$'
            ) AS INTEGER
        )
    ), 0) + 1
    INTO next_sequence
    FROM servicos 
    WHERE nota = nota_param 
    AND equipe_prefixo = equipe_prefixo_param;
    
    -- Gerar o novo ID
    new_id := nota_param || '-' || equipe_prefixo_param || '-' || next_sequence;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Função para obter ID da equipe por prefixo
CREATE OR REPLACE FUNCTION get_equipe_id_by_prefixo(prefixo_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    equipe_id_result INTEGER;
BEGIN
    SELECT id INTO equipe_id_result 
    FROM equipes 
    WHERE prefixo = prefixo_param 
    LIMIT 1;
    
    RETURN equipe_id_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNÇÕES DE AUTORIZAÇÃO
-- =============================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() AND funcao = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é coordenador
CREATE OR REPLACE FUNCTION is_coordenador()
RETURNS BOOLEAN AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() AND funcao = 'Coordenador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é supervisor
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() AND funcao = 'Supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é encarregado
CREATE OR REPLACE FUNCTION is_encarregado()
RETURNS BOOLEAN AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() 
    AND UPPER(funcao) LIKE '%ENCARREGADO%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário está autenticado
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
  BEGIN
    RETURN (auth.uid() IS NOT NULL);
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se encarregado é responsável por uma equipe
CREATE OR REPLACE FUNCTION is_encarregado_da_equipe(equipe_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  is_encarregado_equipe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM equipes e
    INNER JOIN colaboradores c ON e.encarregado_matricula = c.matricula
    WHERE e.id = equipe_id_param
    AND c.user_id = auth.uid()
    AND UPPER(c.funcao) LIKE '%ENCARREGADO%'
  ) INTO is_encarregado_equipe;
  RETURN is_encarregado_equipe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEWS DE FATURAMENTO
-- =============================================

-- View: vw_faturamento_real
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
    (g.quantidade * COALESCE(vf.valor_unitario, 0)) as valor_total
FROM giservico g
JOIN grupo_itens gi ON g.id_item = gi.id
JOIN servicos s ON g.id_servico = s.id
JOIN equipes e ON s.equipe_id = e.id
LEFT JOIN valores_faturamento_real vf ON (
    gi.grupo = vf.grupo 
    AND gi.item = vf.item 
    AND g.status = vf.status
);

-- View: vw_resumo_faturamento_real
CREATE OR REPLACE VIEW vw_resumo_faturamento_real AS
SELECT 
    equipe,
    data_servico,
    grupo,
    item,
    status,
    SUM(quantidade) as total_quantidade,
    valor_unitario,
    unidade,
    SUM(valor_total) as total_valor
FROM vw_faturamento_real
GROUP BY equipe, data_servico, grupo, item, status, valor_unitario, unidade
ORDER BY equipe, data_servico, grupo, item;

-- View: vw_resumo_faturamento_grupo_real
CREATE OR REPLACE VIEW vw_resumo_faturamento_grupo_real AS
SELECT 
    equipe,
    data_servico,
    grupo,
    SUM(valor_total) as total_grupo
FROM vw_faturamento_real
GROUP BY equipe, data_servico, grupo
ORDER BY equipe, data_servico, grupo;

-- =============================================
-- COMENTÁRIOS DAS TABELAS
-- =============================================

COMMENT ON TABLE colaboradores IS 'Tabela de colaboradores do sistema';
COMMENT ON TABLE equipes IS 'Tabela de equipes de trabalho';
COMMENT ON TABLE composicao_equipe IS 'Composição das equipes com colaboradores';
COMMENT ON TABLE grupo_itens IS 'Catálogo de grupos e itens de serviços';
COMMENT ON TABLE servicos IS 'Serviços planejados e executados';
COMMENT ON TABLE giservico IS 'Itens de serviços executados';
COMMENT ON TABLE execucoes_colaborador IS 'Execuções de colaboradores em serviços';
COMMENT ON TABLE historico_turno IS 'Histórico de turnos dos colaboradores';
COMMENT ON TABLE servico_header IS 'Cabeçalhos de serviços por equipe';
COMMENT ON TABLE valores_faturamento_real IS 'Valores de faturamento por item e status';

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id ON colaboradores(user_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_matricula ON colaboradores(matricula);
CREATE INDEX IF NOT EXISTS idx_equipes_prefixo ON equipes(prefixo);
CREATE INDEX IF NOT EXISTS idx_equipes_encarregado ON equipes(encarregado_matricula);
CREATE INDEX IF NOT EXISTS idx_servicos_equipe_id ON servicos(equipe_id);
CREATE INDEX IF NOT EXISTS idx_servicos_data_planejada ON servicos(data_planejada);
CREATE INDEX IF NOT EXISTS idx_giservico_servico_id ON giservico(id_servico);
CREATE INDEX IF NOT EXISTS idx_giservico_item_id ON giservico(id_item);
CREATE INDEX IF NOT EXISTS idx_execucoes_servico_id ON execucoes_colaborador(servico_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_colaborador_id ON execucoes_colaborador(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_historico_turno_data ON historico_turno(data_turno);
CREATE INDEX IF NOT EXISTS idx_valores_faturamento_grupo_item ON valores_faturamento_real(grupo, item, status);