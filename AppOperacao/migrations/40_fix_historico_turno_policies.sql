-- =====================================================
-- Migração 40: Políticas ULTRA SIMPLES para historico_turno
-- =====================================================
-- 
-- CONTEXTO: Encarregado confirma início de turno e gera uma linha
-- para CADA colaborador da sua equipe (inserção em lote).
--
-- SOLUÇÃO: Políticas extremamente simples para evitar qualquer
-- complexidade ou referência cíclica.
-- =====================================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Allow admin to delete shift history" ON historico_turno;
DROP POLICY IF EXISTS "Allow admin, supervisor, coordinator to update shift history" ON historico_turno;
DROP POLICY IF EXISTS "Insert shift history by role" ON historico_turno;
DROP POLICY IF EXISTS "View own and hierarchical shift history" ON historico_turno;
DROP POLICY IF EXISTS "Visualizar historico turno simplificado" ON historico_turno;
DROP POLICY IF EXISTS "Inserir historico turno simplificado" ON historico_turno;
DROP POLICY IF EXISTS "Atualizar historico turno simplificado" ON historico_turno;
DROP POLICY IF EXISTS "Excluir historico turno simplificado" ON historico_turno;

-- POLÍTICA ULTRA SIMPLES: SELECT
-- Qualquer usuário autenticado pode ver qualquer registro
CREATE POLICY "historico_turno_select_simple" ON historico_turno
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- POLÍTICA ULTRA SIMPLES: INSERT
-- Qualquer usuário autenticado pode inserir qualquer registro
-- (A lógica de negócio no frontend já controla quem pode fazer o quê)
CREATE POLICY "historico_turno_insert_simple" ON historico_turno
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- POLÍTICA ULTRA SIMPLES: UPDATE
-- Apenas Admin, Coordenador, Supervisor (verificação direta)
CREATE POLICY "historico_turno_update_simple" ON historico_turno
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM colaboradores 
            WHERE user_id = auth.uid() 
            AND funcao IN ('Admin', 'Coordenador', 'Supervisor')
        )
    );

-- POLÍTICA ULTRA SIMPLES: DELETE
-- Apenas Admin, Coordenador, Supervisor (verificação direta)
CREATE POLICY "historico_turno_delete_simple" ON historico_turno
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM colaboradores 
            WHERE user_id = auth.uid() 
            AND funcao IN ('Admin', 'Coordenador', 'Supervisor')
        )
    );

-- =====================================================
-- 3. VERIFICAÇÃO E LOG
-- =====================================================

-- Verificar políticas criadas
SELECT 
    'Política: ' || policyname as politica,
    'Comando: ' || cmd as comando
FROM pg_policies 
WHERE tablename = 'historico_turno' 
    AND schemaname = 'public'
ORDER BY cmd, policyname;

RAISE NOTICE '✅ MIGRAÇÃO 40 CONCLUÍDA: Políticas de historico_turno corrigidas (sem referências cíclicas).';