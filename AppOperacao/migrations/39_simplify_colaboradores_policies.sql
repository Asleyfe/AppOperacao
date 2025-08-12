-- =====================================================
-- MIGRAÇÃO 39: SIMPLIFICAR POLÍTICAS DE COLABORADORES
-- =====================================================
-- Data: Dezembro 2024
-- Descrição: Remove referências cíclicas das políticas
--            de colaboradores para evitar recursão infinita
-- =====================================================

-- Remove políticas existentes que causam recursão
DROP POLICY IF EXISTS "Visualização de colaboradores por perfil" ON colaboradores;
DROP POLICY IF EXISTS "Apenas administradores podem inserir colaboradores" ON colaboradores;
DROP POLICY IF EXISTS "Apenas administradores podem atualizar colaboradores" ON colaboradores;
DROP POLICY IF EXISTS "Apenas administradores podem excluir colaboradores" ON colaboradores;

-- Política simples para SELECT - todos os usuários autenticados podem ver colaboradores
CREATE POLICY "Colaboradores visíveis para usuários autenticados" ON colaboradores
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Política para INSERT - apenas admin (sem usar função is_admin)
CREATE POLICY "Apenas administradores podem inserir colaboradores" ON colaboradores
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM colaboradores c 
            WHERE c.user_id = auth.uid() AND c.funcao = 'Admin'
        )
    );

-- Política para UPDATE - apenas admin (sem usar função is_admin)
CREATE POLICY "Apenas administradores podem atualizar colaboradores" ON colaboradores
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM colaboradores c 
            WHERE c.user_id = auth.uid() AND c.funcao = 'Admin'
        )
    );

-- Política para DELETE - apenas admin (sem usar função is_admin)
CREATE POLICY "Apenas administradores podem excluir colaboradores" ON colaboradores
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM colaboradores c 
            WHERE c.user_id = auth.uid() AND c.funcao = 'Admin'
        )
    );

-- =====================================================
-- COMENTÁRIOS DA MIGRAÇÃO
-- =====================================================
-- PROBLEMA RESOLVIDO:
-- As políticas anteriores usavam funções como is_admin(), is_coordenador(),
-- etc., que por sua vez faziam consultas na tabela colaboradores.
-- Como a tabela colaboradores tinha RLS habilitado, isso criava recursão infinita.
--
-- SOLUÇÃO APLICADA:
-- 1. Política SELECT simples: usuários autenticados podem ver todos os colaboradores
-- 2. Políticas INSERT/UPDATE/DELETE: verificação direta da função sem usar funções auxiliares
-- 3. Remove todas as referências cíclicas
--
-- RESULTADO ESPERADO:
-- - Login funcionando sem erro 500
-- - Fim da recursão infinita
-- - Acesso adequado aos dados de colaboradores
-- =====================================================