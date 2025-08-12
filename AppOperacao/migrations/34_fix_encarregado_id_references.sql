-- =====================================================
-- MIGRAÇÃO: CORRIGIR REFERÊNCIAS A ENCARREGADO_ID
-- =====================================================
-- Esta migração corrige todas as funções e views que ainda
-- referenciam a coluna encarregado_id que foi removida na migração 32
-- e substituída por encarregado_matricula

-- =====================================================
-- 1. ATUALIZAR FUNÇÃO pode_ver_equipe
-- =====================================================
CREATE OR REPLACE FUNCTION public.pode_ver_equipe(equipe_id_param INTEGER) 
RETURNS BOOLEAN AS $$
  DECLARE
    user_colaborador_id INTEGER;
    user_funcao TEXT;
    encarregado_da_equipe INTEGER;
    supervisor_do_encarregado INTEGER;
    coordenador_do_encarregado INTEGER;
  BEGIN
    -- Buscar dados do usuário atual
    SELECT id, funcao INTO user_colaborador_id, user_funcao
    FROM colaboradores 
    WHERE user_id = auth.uid();
    
    -- Admin pode ver tudo
    IF user_funcao = 'Admin' THEN
      RETURN TRUE;
    END IF;
    
    -- Buscar encarregado da equipe e sua hierarquia
    SELECT c.id, c.supervisor_id, c.coordenador_id 
    INTO encarregado_da_equipe, supervisor_do_encarregado, coordenador_do_encarregado
    FROM equipes e
    INNER JOIN colaboradores c ON e.encarregado_matricula = c.matricula
    WHERE e.id = equipe_id_param;
    
    -- Coordenador pode ver equipes de seus encarregados
    IF user_funcao = 'Coordenador' THEN
      RETURN (coordenador_do_encarregado = user_colaborador_id);
    END IF;
    
    -- Supervisor pode ver equipes de seus encarregados
    IF user_funcao = 'Supervisor' THEN
      RETURN (supervisor_do_encarregado = user_colaborador_id);
    END IF;
    
    -- Encarregado pode ver apenas sua própria equipe
    IF user_funcao = 'Encarregado' THEN
      RETURN (encarregado_da_equipe = user_colaborador_id);
    END IF;
    
    RETURN FALSE;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. ATUALIZAR FUNÇÃO pode_editar_equipe
-- =====================================================
CREATE OR REPLACE FUNCTION public.pode_editar_equipe(equipe_id_param INTEGER) 
RETURNS BOOLEAN AS $$
  DECLARE
    user_colaborador_id INTEGER;
    user_funcao TEXT;
    encarregado_da_equipe INTEGER;
    supervisor_do_encarregado INTEGER;
    coordenador_do_encarregado INTEGER;
  BEGIN
    -- Buscar dados do usuário atual
    SELECT id, funcao INTO user_colaborador_id, user_funcao
    FROM colaboradores 
    WHERE user_id = auth.uid();
    
    -- Admin pode editar tudo
    IF user_funcao = 'Admin' THEN
      RETURN TRUE;
    END IF;
    
    -- Buscar encarregado da equipe e sua hierarquia
    SELECT c.id, c.supervisor_id, c.coordenador_id 
    INTO encarregado_da_equipe, supervisor_do_encarregado, coordenador_do_encarregado
    FROM equipes e
    INNER JOIN colaboradores c ON e.encarregado_matricula = c.matricula
    WHERE e.id = equipe_id_param;
    
    -- Coordenador pode editar equipes de seus encarregados
    IF user_funcao = 'Coordenador' THEN
      RETURN (coordenador_do_encarregado = user_colaborador_id);
    END IF;
    
    -- Supervisor pode editar equipes de seus encarregados
    IF user_funcao = 'Supervisor' THEN
      RETURN (supervisor_do_encarregado = user_colaborador_id);
    END IF;
    
    -- Encarregado pode editar apenas sua própria equipe
    IF user_funcao = 'Encarregado' THEN
      RETURN (encarregado_da_equipe = user_colaborador_id);
    END IF;
    
    RETURN FALSE;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. ATUALIZAR FUNÇÃO is_encarregado_da_equipe
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_encarregado_da_equipe(equipe_id_param INTEGER) 
RETURNS BOOLEAN AS $$
DECLARE
  is_encarregado_equipe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM equipes e
    INNER JOIN colaboradores c ON e.encarregado_matricula = c.matricula
    WHERE e.id = equipe_id_param
    AND c.user_id = auth.uid()
    AND c.funcao = 'Encarregado'
  ) INTO is_encarregado_equipe;
  RETURN is_encarregado_equipe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ATUALIZAR FUNÇÃO is_encarregado_do_servico
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_encarregado_do_servico(servico_id_param TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
  is_encarregado_servico BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM servicos s
    INNER JOIN equipes e ON s.equipe_id = e.id
    INNER JOIN colaboradores c ON e.encarregado_matricula = c.matricula
    WHERE s.id = servico_id_param
    AND c.user_id = auth.uid()
    AND c.funcao = 'Encarregado'
  ) INTO is_encarregado_servico;
  RETURN is_encarregado_servico;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ATUALIZAR FUNÇÃO pode_editar_servico_por_equipe
-- =====================================================
CREATE OR REPLACE FUNCTION public.pode_editar_servico_por_equipe(equipe_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_id_atual INTEGER;
    user_funcao TEXT;
    encarregado_id INTEGER;
BEGIN
    -- Buscar dados do usuário atual
    SELECT id, funcao INTO user_id_atual, user_funcao
    FROM colaboradores 
    WHERE user_id = auth.uid();
    
    -- Admin pode editar tudo
    IF user_funcao = 'Admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar o ID do encarregado da equipe
    SELECT c.id INTO encarregado_id
    FROM equipes e
    INNER JOIN colaboradores c ON e.encarregado_matricula = c.matricula
    WHERE e.id = equipe_id_param;
    
    RETURN user_id_atual = encarregado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ATUALIZAR VIEW vw_servicos_com_hierarquia
-- =====================================================
DROP VIEW IF EXISTS vw_servicos_com_hierarquia;

CREATE VIEW vw_servicos_com_hierarquia AS
SELECT 
    s.id,
    s.equipe_id,
    s.data_planejada,
    s.descricao,
    s.status,
    s.inicio_deslocamento,
    s.fim_deslocamento,
    s.inicio_execucao,
    s.fim_execucao,
    s.created_at,
    s.updated_at,
    s.equipe_prefixo,
    s.nota,
    c_enc.matricula AS encarregadoid,
    c_enc.nome AS encarregado_nome,
    c_sup.matricula AS supervisorid,
    c_sup.nome AS supervisor_nome,
    c_coord.matricula AS coordenadorid,
    c_coord.nome AS coordenador_nome
FROM servicos s
LEFT JOIN equipes e ON s.equipe_id = e.id
LEFT JOIN colaboradores c_enc ON e.encarregado_matricula = c_enc.matricula
LEFT JOIN colaboradores c_sup ON c_enc.supervisor_id = c_sup.id
LEFT JOIN colaboradores c_coord ON c_enc.coordenador_id = c_coord.id;

-- =====================================================
-- 7. ATUALIZAR FUNÇÃO debug_encarregado_permissions
-- =====================================================
CREATE OR REPLACE FUNCTION public.debug_encarregado_permissions()
RETURNS TABLE(
  user_id UUID,
  colaborador_id INTEGER,
  colaborador_nome TEXT,
  funcao TEXT,
  equipes_responsavel TEXT[],
  pode_ver_equipes BOOLEAN,
  pode_editar_equipes BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    c.id as colaborador_id,
    c.nome as colaborador_nome,
    c.funcao,
    ARRAY_AGG(e.prefixo) as equipes_responsavel,
    public.is_encarregado() as pode_ver_equipes,
    public.is_encarregado() as pode_editar_equipes
  FROM colaboradores c
  LEFT JOIN equipes e ON c.matricula = e.encarregado_matricula
  WHERE c.user_id = auth.uid()
  GROUP BY c.id, c.nome, c.funcao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================
SELECT 'Migração 34 concluída - Todas as referências a encarregado_id foram corrigidas' as status;

-- Teste das funções atualizadas
SELECT 'Testando função pode_ver_equipe:' as teste;
SELECT public.pode_ver_equipe(1) as resultado;

SELECT 'Testando função is_encarregado_da_equipe:' as teste;
SELECT public.is_encarregado_da_equipe(1) as resultado;

SELECT 'Testando view vw_servicos_com_hierarquia:' as teste;
SELECT COUNT(*) as total_registros FROM vw_servicos_com_hierarquia;

/*
=====================================================
RESUMO DA MIGRAÇÃO 34:
=====================================================

✅ FUNÇÕES CORRIGIDAS:
- pode_ver_equipe: e.encarregado_id → e.encarregado_matricula = c.matricula
- pode_editar_equipe: e.encarregado_id → e.encarregado_matricula = c.matricula
- is_encarregado_da_equipe: e.encarregado_id → e.encarregado_matricula = c.matricula
- is_encarregado_do_servico: e.encarregado_id → e.encarregado_matricula = c.matricula
- pode_editar_servico_por_equipe: e.encarregado_id → e.encarregado_matricula = c.matricula
- debug_encarregado_permissions: e.encarregado_id → e.encarregado_matricula = c.matricula

✅ VIEWS CORRIGIDAS:
- vw_servicos_com_hierarquia: e.encarregado_id → e.encarregado_matricula = c.matricula

✅ PROBLEMA RESOLVIDO:
- Erro "column e.encarregado_id does not exist" corrigido
- Todas as funções agora usam a nova estrutura com encarregado_matricula

=====================================================
*/