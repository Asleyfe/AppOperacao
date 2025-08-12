-- =====================================================
-- DIAGNÓSTICO: Problema do usuário JACKSON
-- Data: Janeiro 2025
-- Descrição: Script para diagnosticar por que o botão
--            "Iniciar Deslocamento" não funciona para JACKSON
-- =====================================================

-- =====================================================
-- 1. VERIFICAR DADOS DO USUÁRIO JACKSON
-- =====================================================

-- Verificar se JACKSON existe e tem user_id
SELECT 
    matricula,
    nome,
    funcao,
    user_id,
    supervisor_id,
    coordenador_id
FROM colaboradores 
WHERE UPPER(nome) LIKE '%JACKSON%'
OR matricula = 856011; -- Assumindo que esta é a matrícula do Jackson

-- =====================================================
-- 2. VERIFICAR EQUIPE DO JACKSON
-- =====================================================

-- Verificar qual equipe JACKSON é encarregado
SELECT 
    e.id as equipe_id,
    e.prefixo,
    e.encarregado_matricula,
    c.nome as encarregado_nome,
    c.funcao,
    c.user_id
FROM equipes e
JOIN colaboradores c ON e.encarregado_matricula = c.matricula
WHERE UPPER(c.nome) LIKE '%JACKSON%'
OR c.matricula = 856011;

-- =====================================================
-- 3. VERIFICAR SERVIÇOS DA EQUIPE DO JACKSON
-- =====================================================

-- Verificar serviços da equipe do Jackson para hoje
SELECT 
    s.id,
    s.equipe_id,
    s.data_planejada,
    s.descricao,
    s.status,
    s.inicio_deslocamento,
    s.fim_deslocamento,
    e.prefixo as equipe_prefixo,
    c.nome as encarregado_nome
FROM servicos s
JOIN equipes e ON s.equipe_id = e.id
JOIN colaboradores c ON e.encarregado_matricula = c.matricula
WHERE UPPER(c.nome) LIKE '%JACKSON%'
AND s.data_planejada = CURRENT_DATE
ORDER BY s.id;

-- =====================================================
-- 4. TESTAR FUNÇÕES DE PERMISSÃO
-- =====================================================

-- IMPORTANTE: Execute estes testes logado como JACKSON
-- no Supabase Dashboard

-- Testar função is_encarregado
-- SELECT public.is_encarregado() as jackson_eh_encarregado;

-- Testar função is_encarregado_da_equipe para a equipe do Jackson
-- SELECT public.is_encarregado_da_equipe(2) as jackson_eh_encarregado_equipe_2;
-- (substitua 2 pelo ID real da equipe do Jackson)

-- =====================================================
-- 5. VERIFICAR POLÍTICAS RLS ATIVAS
-- =====================================================

-- Verificar se RLS está ativo na tabela servicos
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'servicos';

-- Verificar políticas ativas na tabela servicos
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'servicos'
ORDER BY cmd, policyname;

-- =====================================================
-- 6. TESTAR FUNÇÃO get_servicos_permitidos
-- =====================================================

-- IMPORTANTE: Execute este teste logado como JACKSON
-- SELECT * FROM public.get_servicos_permitidos()
-- WHERE data_planejada = CURRENT_DATE;

-- =====================================================
-- 7. VERIFICAR LOGS DE ERRO
-- =====================================================

-- Verificar se há erros recentes relacionados a RLS
-- (Este comando só funciona se você tiver acesso aos logs)
-- SELECT * FROM pg_stat_statements 
-- WHERE query LIKE '%servicos%' 
-- AND calls > 0;

-- =====================================================
-- 8. TESTE DE ATUALIZAÇÃO MANUAL
-- =====================================================

-- IMPORTANTE: Execute este teste logado como JACKSON
-- para verificar se consegue atualizar um serviço

/*
-- Primeiro, encontre um serviço do Jackson
SELECT s.id, s.status, s.equipe_id
FROM servicos s
JOIN equipes e ON s.equipe_id = e.id
JOIN colaboradores c ON e.encarregado_matricula = c.matricula
WHERE UPPER(c.nome) LIKE '%JACKSON%'
AND s.data_planejada = CURRENT_DATE
AND s.status = 'Planejado'
LIMIT 1;

-- Depois, tente atualizar (substitua 123 pelo ID real)
UPDATE servicos 
SET 
    status = 'Em Deslocamento',
    inicio_deslocamento = NOW()
WHERE id = 123;

-- Se der erro, anote a mensagem exata
*/

-- =====================================================
-- 9. VERIFICAR ESTRUTURA DA FUNÇÃO get_servicos_permitidos
-- =====================================================

-- Verificar se a função foi corrigida
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'get_servicos_permitidos';

-- =====================================================
-- 10. POSSÍVEIS SOLUÇÕES
-- =====================================================

/*
COM BASE NOS RESULTADOS ACIMA, AS POSSÍVEIS CAUSAS SÃO:

1. FUNÇÃO get_servicos_permitidos ainda não foi corrigida
   SOLUÇÃO: Aplicar a migração 48

2. JACKSON não tem user_id vinculado
   SOLUÇÃO: Vincular user_id do Supabase Auth ao colaborador

3. Políticas RLS estão bloqueando a atualização
   SOLUÇÃO: Verificar e corrigir políticas

4. JACKSON não está na equipe correta
   SOLUÇÃO: Verificar e corrigir dados da equipe

5. Função is_encarregado_da_equipe não funciona
   SOLUÇÃO: Corrigir a função

6. Problema na aplicação (frontend)
   SOLUÇÃO: Verificar logs do navegador/app
*/

-- =====================================================
-- 11. SCRIPT DE CORREÇÃO RÁPIDA
-- =====================================================

-- Se o problema for a função get_servicos_permitidos,
-- execute o conteúdo da migração 48:

/*
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

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
        public.is_admin() OR public.is_supervisor()
        OR
        (
            public.is_encarregado() AND 
            public.is_encarregado_da_equipe(s.equipe_id)
        )
    )
    ORDER BY s.data_planejada DESC, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_servicos_permitidos() TO authenticated;
*/

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
1. Execute as consultas de 1 a 7 para diagnosticar
2. Execute o teste 8 logado como JACKSON
3. Com base nos resultados, aplique a correção apropriada
4. Teste novamente no aplicativo

Se ainda não funcionar, verifique:
- Logs do navegador (F12 > Console)
- Logs do Supabase
- Configuração de autenticação
- Dados de teste
*/

-- FIM DO DIAGNÓSTICO