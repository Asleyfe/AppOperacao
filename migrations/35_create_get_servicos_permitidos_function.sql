-- =====================================================
-- MIGRAÇÃO 35: CRIAR FUNÇÃO get_servicos_permitidos
-- =====================================================
-- Esta função RPC substitui a view vw_servicos_com_hierarquia
-- e aplica as políticas RLS diretamente na função

-- =====================================================
-- 1. CRIAR FUNÇÃO get_servicos_permitidos
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_servicos_permitidos()
RETURNS TABLE(
    id INTEGER,
    equipe_id INTEGER,
    data_planejada DATE,
    descricao TEXT,
    status TEXT,
    inicio_deslocamento TIMESTAMP WITH TIME ZONE,
    fim_deslocamento TIMESTAMP WITH TIME ZONE,
    inicio_execucao TIMESTAMP WITH TIME ZONE,
    fim_execucao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    equipe_prefixo VARCHAR(10),
    nota VARCHAR(50),
    encarregado_id INTEGER,
    encarregado_nome TEXT,
    encarregado_funcao TEXT,
    supervisor_id INTEGER,
    supervisor_nome TEXT,
    coordenador_id INTEGER,
    coordenador_nome TEXT
) AS $$
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Retornar serviços baseado no perfil do usuário
    RETURN QUERY
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
        c_enc.matricula AS encarregado_id,
        c_enc.nome AS encarregado_nome,
        c_enc.funcao AS encarregado_funcao,
        c_sup.matricula AS supervisor_id,
        c_sup.nome AS supervisor_nome,
        c_coord.matricula AS coordenador_id,
        c_coord.nome AS coordenador_nome
    FROM servicos s
    LEFT JOIN equipes e ON s.equipe_id = e.id
    LEFT JOIN colaboradores c_enc ON e.encarregado_matricula = c_enc.matricula
    LEFT JOIN colaboradores c_sup ON c_enc.supervisor_id = c_sup.id
    LEFT JOIN colaboradores c_coord ON c_enc.coordenador_id = c_coord.id
    WHERE (
        -- Admins e supervisores podem ver todos os serviços
        public.is_admin() OR public.is_supervisor()
        OR
        -- Encarregados podem ver apenas serviços de suas equipes
        (
            public.is_encarregado() AND 
            public.is_encarregado_da_equipe(s.equipe_id)
        )
    )
    ORDER BY s.data_planejada DESC, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CONCEDER PERMISSÕES
-- =====================================================

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION public.get_servicos_permitidos() TO authenticated;

-- =====================================================
-- 3. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.get_servicos_permitidos() IS 'Função RPC que retorna serviços permitidos baseado no perfil do usuário logado. Substitui a view vw_servicos_com_hierarquia aplicando RLS diretamente.';

-- =====================================================
-- 4. TESTES DE VERIFICAÇÃO
-- =====================================================

DO $$
BEGIN
    -- Verificar se a função foi criada
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_servicos_permitidos' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE NOTICE '✅ Função get_servicos_permitidos criada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Função get_servicos_permitidos não foi criada';
    END IF;
END $$;

-- =====================================================
-- 5. INSTRUÇÕES DE TESTE
-- =====================================================

/*
PARA TESTAR A FUNÇÃO:

1. Como Admin/Supervisor:
   SELECT COUNT(*) FROM get_servicos_permitidos();
   
2. Como Encarregado:
   SELECT COUNT(*) FROM get_servicos_permitidos();
   
3. Verificar estrutura de retorno:
   SELECT * FROM get_servicos_permitidos() LIMIT 1;

A função deve retornar:
- Todos os serviços para Admins e Supervisores
- Apenas serviços das equipes do encarregado para Encarregados
- Erro de autenticação para usuários não logados
*/

-- =====================================================
-- 6. LOG DE MIGRAÇÃO
-- =====================================================

RAISE NOTICE '🚀 MIGRAÇÃO 35 CONCLUÍDA:';
RAISE NOTICE '   ✅ Função get_servicos_permitidos criada';
RAISE NOTICE '   ✅ Permissões configuradas';
RAISE NOTICE '   ✅ RLS aplicado na função';
RAISE NOTICE '';
RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
RAISE NOTICE '   1. Testar a função com diferentes perfis';
RAISE NOTICE '   2. Verificar se o frontend funciona corretamente';
RAISE NOTICE '   3. Monitorar logs de erro';
RAISE NOTICE '';
RAISE NOTICE '🔧 COMANDOS DE TESTE:';
RAISE NOTICE '   SELECT COUNT(*) FROM get_servicos_permitidos();';
RAISE NOTICE '   SELECT * FROM get_servicos_permitidos() LIMIT 3;';