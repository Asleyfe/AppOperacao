-- =====================================================
-- MIGRAÇÃO 37: CRIAR TABELA HISTORICO_TURNO
-- =====================================================
-- Objetivo: Criar a tabela historico_turno que está sendo usada
--           no código mas não foi encontrada no schema.
--           Incluir políticas RLS adequadas.

-- =====================================================
-- 1. CRIAR TABELA HISTORICO_TURNO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.historico_turno (
  id SERIAL PRIMARY KEY,
  colaborador_matricula INTEGER NOT NULL,
  equipe_prefixo VARCHAR(20) NOT NULL,
  data_turno DATE NOT NULL,
  hora_oper TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_historico_turno_colaborador 
    FOREIGN KEY (colaborador_matricula) 
    REFERENCES public.colaboradores(matricula) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_historico_turno_equipe 
    FOREIGN KEY (equipe_prefixo) 
    REFERENCES public.equipes(prefixo) 
    ON DELETE CASCADE,
    
  -- Evitar duplicatas para mesmo colaborador, equipe e data
  UNIQUE(colaborador_matricula, equipe_prefixo, data_turno)
);

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_historico_turno_colaborador_matricula 
  ON public.historico_turno(colaborador_matricula);
  
CREATE INDEX IF NOT EXISTS idx_historico_turno_equipe_prefixo 
  ON public.historico_turno(equipe_prefixo);
  
CREATE INDEX IF NOT EXISTS idx_historico_turno_data_turno 
  ON public.historico_turno(data_turno);
  
CREATE INDEX IF NOT EXISTS idx_historico_turno_colaborador_data 
  ON public.historico_turno(colaborador_matricula, data_turno);

-- =====================================================
-- 3. CRIAR TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_historico_turno_updated_at
  BEFORE UPDATE ON public.historico_turno
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 4. HABILITAR RLS E CRIAR POLÍTICAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.historico_turno ENABLE ROW LEVEL SECURITY;

-- Política para visualização
-- Admin, Coordenador e Supervisor podem ver todos os registros
-- Encarregados podem ver apenas registros de suas equipes
-- Colaboradores operacionais podem ver apenas seus próprios registros
CREATE POLICY "Usuários podem ver histórico de turno conforme permissões" 
ON public.historico_turno
FOR SELECT
USING (
  -- Admin, Coordenador e Supervisor podem ver todos
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
    AND c.funcao IN ('Admin', 'Coordenador', 'Supervisor')
  )
  OR
  -- Encarregados podem ver registros de suas equipes
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    JOIN public.equipes e ON e.encarregado_matricula = c.matricula
    WHERE c.user_id = auth.uid()
    AND c.funcao = 'Encarregado'
    AND e.prefixo = historico_turno.equipe_prefixo
  )
  OR
  -- Colaboradores podem ver apenas seus próprios registros
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
    AND c.matricula = historico_turno.colaborador_matricula
  )
);

-- Política para inserção
-- Admin, Coordenador e Supervisor podem inserir qualquer registro
-- Encarregados podem inserir registros para suas equipes
-- Colaboradores operacionais podem inserir apenas seus próprios registros
CREATE POLICY "Usuários podem inserir histórico de turno conforme permissões" 
ON public.historico_turno
FOR INSERT
WITH CHECK (
  -- Admin, Coordenador e Supervisor podem inserir todos
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
    AND c.funcao IN ('Admin', 'Coordenador', 'Supervisor')
  )
  OR
  -- Encarregados podem inserir registros para suas equipes
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    JOIN public.equipes e ON e.encarregado_matricula = c.matricula
    WHERE c.user_id = auth.uid()
    AND c.funcao = 'Encarregado'
    AND e.prefixo = historico_turno.equipe_prefixo
  )
  OR
  -- Colaboradores podem inserir apenas seus próprios registros
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
    AND c.matricula = historico_turno.colaborador_matricula
  )
);

-- Política para atualização
-- Apenas Admin, Coordenador e Supervisor podem atualizar
CREATE POLICY "Apenas supervisores podem atualizar histórico de turno" 
ON public.historico_turno
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
    AND c.funcao IN ('Admin', 'Coordenador', 'Supervisor')
  )
);

-- Política para exclusão
-- Apenas Admin pode excluir
CREATE POLICY "Apenas administradores podem excluir histórico de turno" 
ON public.historico_turno
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
    AND c.funcao = 'Admin'
  )
);

-- =====================================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.historico_turno IS 'Registro de início de turnos dos colaboradores por equipe';
COMMENT ON COLUMN public.historico_turno.id IS 'Chave primária única';
COMMENT ON COLUMN public.historico_turno.colaborador_matricula IS 'Matrícula do colaborador (FK para colaboradores.matricula)';
COMMENT ON COLUMN public.historico_turno.equipe_prefixo IS 'Prefixo da equipe (FK para equipes.prefixo)';
COMMENT ON COLUMN public.historico_turno.data_turno IS 'Data do turno';
COMMENT ON COLUMN public.historico_turno.hora_oper IS 'Data e hora de início da operação';
COMMENT ON COLUMN public.historico_turno.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN public.historico_turno.updated_at IS 'Data e hora da última atualização';

-- =====================================================
-- 6. VERIFICAÇÃO FINAL
-- =====================================================

SELECT 'Verificação da tabela historico_turno criada:' as status;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'historico_turno' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'historico_turno' 
  AND schemaname = 'public';

RAISE NOTICE '✅ MIGRAÇÃO 37 CONCLUÍDA: Tabela historico_turno criada com políticas RLS.';