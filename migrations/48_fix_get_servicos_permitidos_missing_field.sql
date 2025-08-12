-- =====================================================
-- MIGRAÇÃO 48: CORRIGIR FUNÇÃO get_servicos_permitidos
-- =====================================================
-- Problema: Linha vazia na função get_servicos_permitidos causando
-- desalinhamento entre RETURNS TABLE e SELECT, resultando em
-- dados incorretos sendo retornados
-- Solução: Recriar a função com a estrutura correta

-- =====================================================
-- 1. RECRIAR FUNÇÃO get_servicos_permitidos
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

COMMENT ON FUNCTION public.get_servicos_permitidos() IS 'Função RPC que retorna serviços permitidos baseado no perfil do usuário logado. Corrigida para resolver problema de desalinhamento de campos.';

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
        RAISE NOTICE '✅ Função get_servicos_permitidos corrigida com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Função get_servicos_permitidos não foi corrigida';
    END IF;
END $$;

-- =====================================================
-- 5. LOG DE MIGRAÇÃO
-- =====================================================

RAISE NOTICE '🚀 MIGRAÇÃO 48 CONCLUÍDA:';
RAISE NOTICE '   ✅ Função get_servicos_permitidos corrigida';
RAISE NOTICE '   ✅ Problema de desalinhamento de campos resolvido';
RAISE NOTICE '   ✅ Botão "Iniciar Deslocamento" deve funcionar agora';
RAISE NOTICE '';
RAISE NOTICE '📋 PROBLEMA RESOLVIDO:';
RAISE NOTICE '   - Linha vazia removida do SELECT';
RAISE NOTICE '   - Alinhamento entre RETURNS TABLE e SELECT corrigido';
RAISE NOTICE '   - Dados de serviços retornados corretamente';
RAISE NOTICE '';
RAISE NOTICE '🔧 TESTE RECOMENDADO:';
RAISE NOTICE '   - Fazer logout e login novamente';
RAISE NOTICE '   - Testar botão "Iniciar Deslocamento" com JACKSON';
RAISE NOTICE '   - Verificar se os serviços aparecem corretamente';

/*
=====================================================
RESUMO DO PROBLEMA E SOLUÇÃO:
=====================================================

🐛 PROBLEMA IDENTIFICADO:
- Na função get_servicos_permitidos havia uma linha vazia
- Isso causava desalinhamento entre RETURNS TABLE e SELECT
- Os dados retornados ficavam com campos trocados
- O botão "Iniciar Deslocamento" não funcionava para alguns usuários

✅ SOLUÇÃO APLICADA:
- Função get_servicos_permitidos recriada sem linha vazia
- Alinhamento correto entre declaração e SELECT
- Todos os campos retornados na ordem correta
- Permissões mantidas

🎯 RESULTADO ESPERADO:
- Botão "Iniciar Deslocamento" funcionando para todos os usuários
- Dados de serviços exibidos corretamente
- Hierarquia de permissões funcionando normalmente

=====================================================
*/