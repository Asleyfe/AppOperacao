-- =====================================================
-- MIGRAÇÃO 41: CORRIGIR RLS DA TABELA EXECUCOES_COLABORADOR
-- =====================================================
-- Data: Janeiro 2025
-- Descrição: Desabilitar RLS na tabela execucoes_colaborador
--            para desenvolvimento, corrigindo erro de
--            "column colaborador_id does not exist"
-- =====================================================

-- PROBLEMA IDENTIFICADO:
-- A tabela execucoes_colaborador não foi incluída na migração 33
-- que desabilitou o RLS para desenvolvimento, causando erro
-- "column colaborador_id does not exist" durante operações
-- que envolvem políticas RLS.

-- SOLUÇÃO:
-- Desabilitar RLS na tabela execucoes_colaborador para
-- manter consistência com as outras tabelas em desenvolvimento.

-- =====================================================
-- DESABILITAR RLS PARA DESENVOLVIMENTO
-- =====================================================

-- Desabilitar RLS na tabela execucoes_colaborador
ALTER TABLE execucoes_colaborador DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se RLS foi desabilitado corretamente
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '❌ RLS HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename = 'execucoes_colaborador';

-- =====================================================
-- COMENTÁRIOS DA MIGRAÇÃO
-- =====================================================
-- PROBLEMA RESOLVIDO:
-- - Erro "column colaborador_id does not exist" corrigido
-- - Tabela execucoes_colaborador agora tem RLS desabilitado
-- - Consistência mantida com outras tabelas em desenvolvimento
--
-- RESULTADO ESPERADO:
-- - Checklist funcionando sem erros de RLS
-- - Operações de inserção/atualização funcionando normalmente
-- - Fim dos erros relacionados a políticas RLS
-- =====================================================