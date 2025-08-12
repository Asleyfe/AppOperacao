-- =====================================================
-- MIGRAÇÃO 42: DESABILITAR RLS NAS TABELAS RESTANTES
-- =====================================================
-- Data: Janeiro 2025
-- Descrição: Desabilitar RLS nas tabelas servicos e servico_header
--            que ainda estão com RLS ativo
-- =====================================================

-- PROBLEMA IDENTIFICADO:
-- As tabelas servicos e servico_header ainda estão com RLS ativo,
-- enquanto as outras tabelas já foram desabilitadas para desenvolvimento.
-- Isso pode causar inconsistências e problemas de acesso.

-- SOLUÇÃO:
-- Desabilitar RLS nas tabelas servicos e servico_header para
-- manter consistência com as outras tabelas em desenvolvimento.

-- =====================================================
-- VERIFICAÇÃO INICIAL
-- =====================================================

-- Verificar status atual do RLS em todas as tabelas
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
AND tablename IN (
    'servicos', 
    'servico_header', 
    'execucoes_colaborador',
    'equipes', 
    'colaboradores', 
    'composicao_equipe', 
    'giservico', 
    'grupo_itens'
)
ORDER BY tablename;

-- =====================================================
-- DESABILITAR RLS NAS TABELAS RESTANTES
-- =====================================================

-- Desabilitar RLS na tabela servicos (se ainda estiver ativo)
ALTER TABLE servicos DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela servico_header (se ainda estiver ativo)
ALTER TABLE servico_header DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as tabelas agora têm RLS desabilitado
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '❌ RLS AINDA HABILITADO'
        ELSE '✅ RLS DESABILITADO'
    END as status_final
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'servicos', 
    'servico_header', 
    'execucoes_colaborador',
    'equipes', 
    'colaboradores', 
    'composicao_equipe', 
    'giservico', 
    'grupo_itens'
)
ORDER BY tablename;

-- =====================================================
-- COMENTÁRIOS DA MIGRAÇÃO
-- =====================================================
-- RESULTADO ESPERADO:
-- - Todas as tabelas principais com RLS desabilitado
-- - Consistência total no ambiente de desenvolvimento
-- - Fim de problemas relacionados a políticas RLS
-- - Checklist e outras funcionalidades funcionando normalmente
--
-- TABELAS AFETADAS:
-- ✅ servicos - RLS desabilitado
-- ✅ servico_header - RLS desabilitado
-- ✅ execucoes_colaborador - RLS já desabilitado (migração 41)
-- ✅ equipes - RLS já desabilitado (migração 33)
-- ✅ colaboradores - RLS já desabilitado (migração 33)
-- ✅ composicao_equipe - RLS já desabilitado (migração 33)
-- ✅ giservico - RLS já desabilitado (migração 33)
-- ✅ grupo_itens - RLS já desabilitado (migração 33)
-- =====================================================