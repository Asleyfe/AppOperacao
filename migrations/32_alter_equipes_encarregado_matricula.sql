-- =====================================================
-- MIGRAÇÃO: ALTERAR ENCARREGADO_ID PARA ENCARREGADO_MATRICULA
-- Data: 2025-01-27
-- Status: ✅ EXECUTADA COM SUCESSO VIA MCP SUPABASE
-- =====================================================

-- OBJETIVO:
-- Alterar a coluna encarregado_id (INTEGER referenciando colaboradores.id)
-- para encarregado_matricula (INTEGER referenciando colaboradores.matricula)
-- na tabela equipes, incluindo exibição do nome do colaborador nas views

-- =====================================================
-- 1. VERIFICAÇÃO PRÉ-MIGRAÇÃO
-- =====================================================
SELECT 'Verificação inicial - Estrutura atual:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'equipes' 
AND column_name IN ('encarregado_id', 'encarregado_matricula');

-- =====================================================
-- 2. BACKUP DOS DADOS ATUAIS
-- =====================================================
CREATE TEMP TABLE backup_equipes AS 
SELECT e.*, c.matricula as encarregado_matricula_backup
FROM equipes e
JOIN colaboradores c ON e.encarregado_id = c.id;

-- =====================================================
-- 3. REMOVER VIEWS DEPENDENTES
-- =====================================================
-- Views que precisam ser removidas temporariamente:
-- - vw_servicos_com_hierarquia (usa e.encarregado_id)
-- - vw_equipes_com_matriculas (pode usar e.encarregado_id)

DROP VIEW IF EXISTS vw_servicos_com_hierarquia;
DROP VIEW IF EXISTS vw_equipes_com_matriculas;

-- =====================================================
-- 4. REMOVER CONSTRAINT FOREIGN KEY
-- =====================================================
ALTER TABLE equipes DROP CONSTRAINT IF EXISTS equipes_encarregado_id_fkey;

-- =====================================================
-- 5. ADICIONAR NOVA COLUNA
-- =====================================================
ALTER TABLE equipes ADD COLUMN encarregado_matricula INTEGER;

-- =====================================================
-- 6. POPULAR A NOVA COLUNA COM OS DADOS DA MATRÍCULA
-- =====================================================
UPDATE equipes 
SET encarregado_matricula = c.matricula
FROM colaboradores c 
WHERE equipes.encarregado_id = c.id;

-- =====================================================
-- 7. VERIFICAR SE TODOS OS DADOS FORAM MIGRADOS
-- =====================================================
SELECT 'Verificação da migração de dados:' as status;
SELECT 
    COUNT(*) as total_registros,
    COUNT(encarregado_matricula) as registros_com_matricula,
    COUNT(*) - COUNT(encarregado_matricula) as registros_sem_matricula
FROM equipes;

-- =====================================================
-- 8. TORNAR A NOVA COLUNA NOT NULL
-- =====================================================
ALTER TABLE equipes ALTER COLUMN encarregado_matricula SET NOT NULL;

-- =====================================================
-- 9. REMOVER A COLUNA ANTIGA
-- =====================================================
ALTER TABLE equipes DROP COLUMN encarregado_id;

-- =====================================================
-- 10. RECRIAR CONSTRAINT
-- =====================================================
ALTER TABLE equipes 
ADD CONSTRAINT equipes_encarregado_matricula_fkey 
FOREIGN KEY (encarregado_matricula) REFERENCES colaboradores(matricula);

-- =====================================================
-- 11. RECRIAR AS VIEWS COM A NOVA ESTRUTURA
-- =====================================================

-- Recriar vw_equipes_com_matriculas
CREATE VIEW vw_equipes_com_matriculas AS
SELECT 
    e.id,
    e.prefixo,
    e.data,
    e.encarregado_matricula,
    c.nome as encarregado_nome,
    e.status_composicao,
    e.tipo_equipe,
    e.created_at,
    e.updated_at
FROM equipes e
JOIN colaboradores c ON e.encarregado_matricula = c.matricula;

-- Recriar vw_servicos_com_hierarquia
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
-- 12. VERIFICAÇÃO FINAL
-- =====================================================
SELECT 'Verificação final - Nova estrutura:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'equipes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 13. TESTE DAS VIEWS RECRIADAS
-- =====================================================
SELECT 'Teste da view vw_equipes_com_matriculas:' as status;
SELECT * FROM vw_equipes_com_matriculas LIMIT 3;

SELECT 'Teste da view vw_servicos_com_hierarquia:' as status;
SELECT id, encarregadoid, encarregado_nome FROM vw_servicos_com_hierarquia LIMIT 3;

-- =====================================================
-- RESUMO DA MIGRAÇÃO
-- =====================================================
-- ✅ Coluna encarregado_id removida
-- ✅ Coluna encarregado_matricula adicionada (INTEGER, NOT NULL)
-- ✅ Foreign key recriada: equipes.encarregado_matricula -> colaboradores.matricula
-- ✅ Views recriadas:
--    - vw_equipes_com_matriculas (agora inclui encarregado_nome)
--    - vw_servicos_com_hierarquia (atualizada para usar encarregado_matricula)
-- ✅ Todos os dados migrados sem perda
-- ✅ Migração executada com sucesso via MCP Supabase em 2025-01-27

SELECT 'Migração concluída com sucesso!' as status;