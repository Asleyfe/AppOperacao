-- =====================================================
-- MIGRAÇÃO 38: CORREÇÃO RECURSÃO INFINITA RLS
-- =====================================================
-- Data: Dezembro 2024
-- Descrição: Corrige recursão infinita nas funções RLS
--            que causava erro 500 no login
-- =====================================================

-- Função: is_admin (com bypass de RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() AND funcao = 'Admin'
  );
END;
$$;

-- Função: is_coordenador (com bypass de RLS)
CREATE OR REPLACE FUNCTION is_coordenador()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() AND funcao = 'Coordenador'
  );
END;
$$;

-- Função: is_supervisor (com bypass de RLS)
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass RLS para evitar recursão infinita
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM colaboradores 
    WHERE user_id = auth.uid() AND funcao = 'Supervisor'
  );
END;
$$;

-- Função: is_encarregado (com bypass de RLS)
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
    WHERE user_id = auth.uid() AND funcao = 'Encarregado'
  );
END;
$$;

-- =====================================================
-- COMENTÁRIOS DA MIGRAÇÃO
-- =====================================================
-- PROBLEMA IDENTIFICADO:
-- As funções RLS (is_admin, is_coordenador, is_supervisor, is_encarregado)
-- faziam consultas na tabela 'colaboradores', mas essa tabela possui
-- políticas RLS que usam essas mesmas funções, criando recursão infinita.
--
-- SOLUÇÃO APLICADA:
-- 1. Mudança de LANGUAGE sql para plpgsql
-- 2. Adição de 'SET LOCAL row_security = off' para bypass de RLS
-- 3. Uso de bloco BEGIN/END com RETURN
--
-- RESULTADO ESPERADO:
-- - Login funcionando para todos os perfis
-- - Fim dos erros 500 (Internal Server Error)
-- - Fim das mensagens de 'infinite recursion detected'
-- =====================================================