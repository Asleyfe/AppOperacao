-- =====================================================
-- MIGRAÇÃO 47: CORRIGIR FUNÇÕES DE VERIFICAÇÃO DE ENCARREGADO
-- =====================================================
-- Problema: As funções estão comparando com 'Encarregado' exato,
-- mas no banco a função é 'ENCARREGADO TURMA L.V.'
-- Solução: Usar UPPER() e LIKE '%ENCARREGADO%' para detectar variações

-- =====================================================
-- 1. CORRIGIR FUNÇÃO is_encarregado
-- =====================================================
CREATE OR REPLACE FUNCTION is_encarregado()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() 
    AND UPPER(funcao) LIKE '%ENCARREGADO%'
  );
END;
$$;

-- =====================================================
-- 2. CORRIGIR FUNÇÃO is_encarregado_da_equipe
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
    AND UPPER(c.funcao) LIKE '%ENCARREGADO%'
  ) INTO is_encarregado_equipe;
  RETURN is_encarregado_equipe;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CORRIGIR FUNÇÃO is_encarregado_do_servico (se existir)
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
    WHERE s.id::TEXT = servico_id_param
    AND c.user_id = auth.uid()
    AND UPPER(c.funcao) LIKE '%ENCARREGADO%'
  ) INTO is_encarregado_servico;
  RETURN is_encarregado_servico;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION is_encarregado() IS 'Verifica se o usuário logado é um encarregado (qualquer variação da função que contenha ENCARREGADO)';
COMMENT ON FUNCTION is_encarregado_da_equipe(INTEGER) IS 'Verifica se o usuário logado é encarregado da equipe especificada';
COMMENT ON FUNCTION is_encarregado_do_servico(TEXT) IS 'Verifica se o usuário logado é encarregado do serviço especificado';

-- =====================================================
-- 5. TESTE DE VERIFICAÇÃO
-- =====================================================
-- Para testar após aplicar a migração:
-- SELECT is_encarregado(); -- Deve retornar true para Jackson
-- SELECT is_encarregado_da_equipe(2); -- Deve retornar true para Jackson na equipe 756003A