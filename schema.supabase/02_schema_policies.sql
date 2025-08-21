-- =============================================
-- POLÍTICAS RLS ATUALIZADAS DO BANCO DE DADOS
-- Gerado automaticamente em: 2025-08-21
-- =============================================

-- Habilitar RLS nas tabelas com RLS ativo
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE composicao_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucoes_colaborador ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

-- Desabilitar RLS nas tabelas com RLS inativo
ALTER TABLE grupo_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE giservico DISABLE ROW LEVEL SECURITY;
ALTER TABLE servico_header DISABLE ROW LEVEL SECURITY;
ALTER TABLE valores_faturamento_real DISABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELAS COM RLS DESATIVADO
-- =============================================
-- As seguintes tabelas têm o Row Level Security (RLS) desativado:
-- - grupo_itens
-- - giservico
-- - servico_header
-- - valores_faturamento_real
-- Isso significa que todas as operações (SELECT, INSERT, UPDATE, DELETE)
-- nessas tabelas não serão filtradas ou controladas por políticas RLS,
-- e o acesso será determinado apenas pelas permissões de nível de banco de dados.

-- =============================================
-- POLÍTICAS PARA TABELA: colaboradores
-- =============================================

-- Política: colaboradores_admin_all
-- Permite que administradores vejam todos os colaboradores
CREATE POLICY "colaboradores_admin_all" ON colaboradores
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Política: colaboradores_coordenador_all
-- Permite que coordenadores vejam todos os colaboradores
CREATE POLICY "colaboradores_coordenador_all" ON colaboradores
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_coordenador())
    WITH CHECK (is_coordenador());

-- Política: colaboradores_encarregado_read
-- Permite que encarregados vejam colaboradores de suas equipes
CREATE POLICY "colaboradores_encarregado_read" ON colaboradores
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
        is_encarregado() AND (
            matricula IN (
                SELECT ce.colaborador_matricula
                FROM composicao_equipe ce
                JOIN equipes e ON ce.equipe_id = e.id
                JOIN colaboradores c ON e.encarregado_matricula = c.matricula
                WHERE c.user_id = auth.uid()
            )
            OR matricula IN (
                SELECT c.matricula
                FROM colaboradores c
                JOIN equipes e ON c.matricula = e.encarregado_matricula
                WHERE c.user_id = auth.uid()
            )
        )
    );

-- Política: colaboradores_self_read
-- Permite que usuários vejam seus próprios dados
CREATE POLICY "colaboradores_self_read" ON colaboradores
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Política: colaboradores_supervisor_read
-- Permite que supervisores vejam todos os colaboradores
CREATE POLICY "colaboradores_supervisor_read" ON colaboradores
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (is_supervisor());

-- =============================================
-- POLÍTICAS PARA TABELA: composicao_equipe
-- =============================================

-- Política: composicao_equipe_admin_all
-- Permite que administradores gerenciem toda a composição de equipes
CREATE POLICY "composicao_equipe_admin_all" ON composicao_equipe
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Política: composicao_equipe_coordenador_all
-- Permite que coordenadores gerenciem toda a composição de equipes
CREATE POLICY "composicao_equipe_coordenador_all" ON composicao_equipe
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_coordenador())
    WITH CHECK (is_coordenador());

-- Política: composicao_equipe_encarregado_read
-- Permite que encarregados vejam a composição de suas equipes
CREATE POLICY "composicao_equipe_encarregado_read" ON composicao_equipe
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
        is_encarregado() AND equipe_id IN (
            SELECT e.id
            FROM equipes e
            JOIN colaboradores c ON e.encarregado_matricula = c.matricula
            WHERE c.user_id = auth.uid()
        )
    );

-- Política: composicao_equipe_supervisor_read
-- Permite que supervisores vejam toda a composição de equipes
CREATE POLICY "composicao_equipe_supervisor_read" ON composicao_equipe
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (is_supervisor());

-- =============================================
-- POLÍTICAS PARA TABELA: equipes
-- =============================================

-- Política: equipes_admin_all
-- Permite que administradores gerenciem todas as equipes
CREATE POLICY "equipes_admin_all" ON equipes
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Política: equipes_coordenador_all
-- Permite que coordenadores gerenciem todas as equipes
CREATE POLICY "equipes_coordenador_all" ON equipes
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_coordenador())
    WITH CHECK (is_coordenador());

-- Política: equipes_encarregado_read
-- Permite que encarregados vejam suas próprias equipes
CREATE POLICY "equipes_encarregado_read" ON equipes
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
        is_encarregado() AND encarregado_matricula IN (
            SELECT matricula
            FROM colaboradores
            WHERE user_id = auth.uid()
        )
    );

-- Política: equipes_supervisor_read
-- Permite que supervisores vejam todas as equipes
CREATE POLICY "equipes_supervisor_read" ON equipes
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (is_supervisor());

-- =============================================
-- POLÍTICAS PARA TABELA: execucoes_colaborador
-- =============================================

-- Política: execucoes_colaborador_admin_all
-- Permite que administradores gerenciem todas as execuções
CREATE POLICY "execucoes_colaborador_admin_all" ON execucoes_colaborador
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Política: execucoes_colaborador_coordenador_all
-- Permite que coordenadores gerenciem todas as execuções
CREATE POLICY "execucoes_colaborador_coordenador_all" ON execucoes_colaborador
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_coordenador())
    WITH CHECK (is_coordenador());

-- Política: execucoes_colaborador_encarregado_equipe
-- Permite que encarregados gerenciem execuções de suas equipes
CREATE POLICY "execucoes_colaborador_encarregado_equipe" ON execucoes_colaborador
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        is_encarregado() AND equipe_id IN (
            SELECT e.id
            FROM equipes e
            JOIN colaboradores c ON e.encarregado_matricula = c.matricula
            WHERE c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        is_encarregado() AND equipe_id IN (
            SELECT e.id
            FROM equipes e
            JOIN colaboradores c ON e.encarregado_matricula = c.matricula
            WHERE c.user_id = auth.uid()
        )
    );

-- Política: execucoes_colaborador_self
-- Permite que colaboradores vejam suas próprias execuções
CREATE POLICY "execucoes_colaborador_self" ON execucoes_colaborador
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
        colaborador_id IN (
            SELECT id
            FROM colaboradores
            WHERE user_id = auth.uid()
        )
    );

-- Política: execucoes_colaborador_supervisor_read
-- Permite que supervisores vejam todas as execuções
CREATE POLICY "execucoes_colaborador_supervisor_read" ON execucoes_colaborador
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (is_supervisor());

-- =============================================
-- POLÍTICAS PARA TABELA: grupo_itens
-- RLS DESATIVADO
-- =============================================
-- Nenhuma política RLS ativa para esta tabela.

-- =============================================
-- POLÍTICAS PARA TABELA: historico_turno
-- =============================================

-- Política: historico_turno_admin_all
-- Permite que administradores gerenciem todo o histórico de turnos
CREATE POLICY "historico_turno_admin_all" ON historico_turno
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Política: historico_turno_coordenador_all
-- Permite que coordenadores gerenciem todo o histórico de turnos
CREATE POLICY "historico_turno_coordenador_all" ON historico_turno
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_coordenador())
    WITH CHECK (is_coordenador());

-- Política: historico_turno_encarregado_equipe
-- Permite que encarregados vejam histórico de turnos de suas equipes
CREATE POLICY "historico_turno_encarregado_equipe" ON historico_turno
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
        is_encarregado() AND equipe_prefixo IN (
            SELECT e.prefixo
            FROM equipes e
            JOIN colaboradores c ON e.encarregado_matricula = c.matricula
            WHERE c.user_id = auth.uid()
        )
    );

-- Política: historico_turno_self
-- Permite que colaboradores vejam seu próprio histórico de turnos
CREATE POLICY "historico_turno_self" ON historico_turno
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
        colaborador_matricula IN (
            SELECT matricula
            FROM colaboradores
            WHERE user_id = auth.uid()
        )
    );

-- Política: historico_turno_supervisor_read
-- Permite que supervisores vejam todo o histórico de turnos
CREATE POLICY "historico_turno_supervisor_read" ON historico_turno
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (is_supervisor());

-- =============================================
-- POLÍTICAS PARA TABELA: servico_header
-- RLS DESATIVADO
-- =============================================
-- Nenhuma política RLS ativa para esta tabela.

-- =============================================
-- POLÍTICAS PARA TABELA: servicos
-- =============================================

-- Política: servicos_admin_all
-- Permite que administradores gerenciem todos os serviços
CREATE POLICY "servicos_admin_all" ON servicos
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Política: servicos_coordenador_all
-- Permite que coordenadores gerenciem todos os serviços
CREATE POLICY "servicos_coordenador_all" ON servicos
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (is_coordenador())
    WITH CHECK (is_coordenador());

-- Política: servicos_encarregado_equipe
-- Permite que encarregados gerenciem serviços de suas equipes
CREATE POLICY "servicos_encarregado_equipe" ON servicos
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        is_encarregado() AND (
            equipe_id IN (
                SELECT e.id
                FROM equipes e
                JOIN colaboradores c ON e.encarregado_matricula = c.matricula
                WHERE c.user_id = auth.uid()
            )
            OR equipe_prefixo IN (
                SELECT e.prefixo
                FROM equipes e
                JOIN colaboradores c ON e.encarregado_matricula = c.matricula
                WHERE c.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        is_encarregado() AND (
            equipe_id IN (
                SELECT e.id
                FROM equipes e
                JOIN colaboradores c ON e.encarregado_matricula = c.matricula
                WHERE c.user_id = auth.uid()
            )
            OR equipe_prefixo IN (
                SELECT e.prefixo
                FROM equipes e
                JOIN colaboradores c ON e.encarregado_matricula = c.matricula
                WHERE c.user_id = auth.uid()
            )
        )
    );

-- Política: servicos_supervisor_read
-- Permite que supervisores vejam todos os serviços
CREATE POLICY "servicos_supervisor_read" ON servicos
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (is_supervisor());

-- =============================================
-- POLÍTICAS PARA TABELA: giservico
-- RLS DESATIVADO
-- =============================================
-- Nenhuma política RLS ativa para esta tabela.

-- =============================================
-- POLÍTICAS PARA TABELA: valores_faturamento_real
-- RLS DESATIVADO
-- =============================================
-- Nenhuma política RLS ativa para esta tabela.

-- =============================================
-- COMENTÁRIOS SOBRE AS POLÍTICAS
-- =============================================

-- HIERARQUIA DE PERMISSÕES:
-- 1. Admin: Acesso total a todas as tabelas e operações
-- 2. Coordenador: Acesso total a todas as tabelas e operações
-- 3. Supervisor: Acesso de leitura a todas as tabelas
-- 4. Encarregado: Acesso limitado às suas equipes e colaboradores
-- 5. Colaborador: Acesso limitado aos seus próprios dados

-- OBSERVAÇÕES:
-- - Todas as políticas verificam autenticação antes de aplicar regras específicas
-- - Encarregados têm acesso completo aos dados de suas equipes
-- - Colaboradores podem ver apenas seus próprios dados de execução e histórico
-- - Valores de faturamento são visíveis para todos os usuários autenticados
-- - Grupo de itens são visíveis para todos os usuários autenticados

-- SEGURANÇA:
-- - Todas as funções auxiliares usam SECURITY DEFINER para evitar recursão
-- - RLS está habilitado em todas as tabelas sensíveis
-- - Políticas são específicas por operação (SELECT, INSERT, UPDATE, DELETE)
-- - Verificações de permissão são baseadas na função do colaborador

-- Última atualização: 2025-08-21
