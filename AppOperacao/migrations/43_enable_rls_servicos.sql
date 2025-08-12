-- =====================================================
-- MIGRAÇÃO: Ativar RLS na tabela servicos
-- Data: Janeiro 2025
-- Descrição: Reativa o Row Level Security na tabela servicos
--            após verificação de compatibilidade com a aplicação
-- =====================================================

-- Ativar RLS na tabela servicos
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas existentes estão ativas
-- As seguintes políticas já existem e serão aplicadas:
-- 1. servicos_select_simple - Visualização para usuários autenticados
-- 2. servicos_insert_simple - Inserção para usuários autenticados
-- 3. servicos_update_simple - Atualização por perfil autorizado (Admin, Coordenador, Supervisor, Encarregado)
-- 4. servicos_delete_simple - Exclusão apenas para administradores

-- Verificar status do RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'servicos';

-- Verificar políticas ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'servicos'
ORDER BY cmd, policyname;

-- =====================================================
-- OBSERVAÇÕES
-- =====================================================
-- 
-- MOTIVO DA REATIVAÇÃO:
-- - A aplicação possui sistema de autenticação funcional
-- - 4 colaboradores já possuem user_id vinculado
-- - As políticas RLS estão bem definidas e testadas
-- - O código da aplicação está preparado para trabalhar com RLS
-- 
-- POLÍTICAS APLICADAS:
-- - SELECT: Qualquer usuário autenticado pode visualizar serviços
-- - INSERT: Qualquer usuário autenticado pode criar serviços
-- - UPDATE: Apenas perfis autorizados podem atualizar
-- - DELETE: Apenas administradores podem excluir
-- 
-- COMPATIBILIDADE:
-- - useAuth hook gerencia autenticação corretamente
-- - API usa cliente Supabase configurado
-- - Todas as operações passam pelo sistema de auth
-- 
-- PRÓXIMOS PASSOS:
-- - Monitorar logs de erro na aplicação
-- - Verificar se todas as operações funcionam corretamente
-- - Considerar políticas mais restritivas no futuro se necessário
-- 
-- =====================================================