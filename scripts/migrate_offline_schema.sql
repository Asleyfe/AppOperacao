-- =====================================================
-- SCRIPT DE MIGRAÇÃO - SCHEMA OFFLINE
-- =====================================================
-- Data: 21 de agosto de 2025
-- Objetivo: Corrigir inconsistências críticas entre schema online e offline
-- Prioridade: CRÍTICA
-- Execução: Rodar este script no SQLite offline

-- =====================================================
-- 1. CRIAR TABELA DE CONTROLE DE VERSÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Inserir versão inicial se não existir
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (0, 'Schema inicial');

-- =====================================================
-- 2. BACKUP DAS TABELAS EXISTENTES
-- =====================================================
-- Criar backup da tabela equipes_local
CREATE TABLE IF NOT EXISTS equipes_local_backup AS 
SELECT * FROM equipes_local;

-- Criar backup da tabela colaboradores_local
CREATE TABLE IF NOT EXISTS colaboradores_local_backup AS 
SELECT * FROM colaboradores_local;

-- =====================================================
-- 3. CORRIGIR TABELA EQUIPES_LOCAL
-- =====================================================
PRAGMA foreign_keys=off;

-- Criar nova tabela com estrutura correta
CREATE TABLE equipes_local_new (
    id INTEGER PRIMARY KEY,
    data DATE NOT NULL,
    prefixo TEXT UNIQUE NOT NULL,
    tipo_equipe TEXT DEFAULT 'LV' NOT NULL CHECK (tipo_equipe IN ('LV', 'LM', 'PODA', 'LM LEVE')),
    status_composicao TEXT DEFAULT 'Pendente' NOT NULL CHECK (status_composicao IN ('Pendente', 'Aprovada', 'Rejeitada')),
    encarregado_matricula INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT 0,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrar dados existentes (assumindo data = hoje para registros sem data)
INSERT INTO equipes_local_new (
    id, prefixo, tipo_equipe, status_composicao, encarregado_matricula, 
    data, created_at, updated_at, synced, last_modified
)
SELECT 
    id, 
    prefixo, 
    COALESCE(tipo_equipe, 'LV') as tipo_equipe,
    COALESCE(status_composicao, 'Pendente') as status_composicao, 
    encarregado_matricula,
    COALESCE(data, DATE('now')) as data, -- Usar data atual se não existir
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
    COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at,
    COALESCE(synced, 0) as synced,
    COALESCE(last_modified, CURRENT_TIMESTAMP) as last_modified
FROM equipes_local;

-- Substituir tabela antiga
DROP TABLE equipes_local;
ALTER TABLE equipes_local_new RENAME TO equipes_local;

PRAGMA foreign_keys=on;

-- =====================================================
-- 4. CORRIGIR TABELA COLABORADORES_LOCAL
-- =====================================================
-- Adicionar campos ausentes se não existirem
ALTER TABLE colaboradores_local ADD COLUMN user_id TEXT;
ALTER TABLE colaboradores_local ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE colaboradores_local ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Atualizar registros existentes com valores padrão
UPDATE colaboradores_local 
SET 
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR updated_at IS NULL;

-- =====================================================
-- 5. CORRIGIR TABELA SERVICOS_LOCAL
-- =====================================================
-- Adicionar campos de auditoria se não existirem
ALTER TABLE servicos_local ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE servicos_local ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Atualizar registros existentes
UPDATE servicos_local 
SET 
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR updated_at IS NULL;

-- =====================================================
-- 6. CRIAR TABELA EXECUCOES_COLABORADOR_LOCAL
-- =====================================================
CREATE TABLE IF NOT EXISTS execucoes_colaborador_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servico_id TEXT NOT NULL,
    colaborador_id INTEGER NOT NULL,
    equipe_id INTEGER NOT NULL,
    data_execucao DATE NOT NULL,
    inicio_participacao TIMESTAMP,
    fim_participacao TIMESTAMP,
    duracao_minutos INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT 0,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (colaborador_id) REFERENCES colaboradores_local(id),
    FOREIGN KEY (equipe_id) REFERENCES equipes_local(id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_execucoes_servico_id ON execucoes_colaborador_local(servico_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_colaborador_id ON execucoes_colaborador_local(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_equipe_id ON execucoes_colaborador_local(equipe_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_data ON execucoes_colaborador_local(data_execucao);

-- =====================================================
-- 7. CRIAR TABELA SERVICO_HEADER_LOCAL (SE NECESSÁRIA)
-- =====================================================
CREATE TABLE IF NOT EXISTS servico_header_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servico_id TEXT NOT NULL,
    campo TEXT NOT NULL,
    valor TEXT,
    tipo_campo TEXT DEFAULT 'text',
    ordem INTEGER DEFAULT 0,
    obrigatorio BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT 0,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(servico_id, campo)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_servico_header_servico_id ON servico_header_local(servico_id);
CREATE INDEX IF NOT EXISTS idx_servico_header_campo ON servico_header_local(campo);

-- =====================================================
-- 8. ATUALIZAR ÍNDICES EXISTENTES
-- =====================================================
-- Índices para equipes_local
CREATE INDEX IF NOT EXISTS idx_equipes_data ON equipes_local(data);
CREATE INDEX IF NOT EXISTS idx_equipes_prefixo ON equipes_local(prefixo);
CREATE INDEX IF NOT EXISTS idx_equipes_encarregado ON equipes_local(encarregado_matricula);
CREATE INDEX IF NOT EXISTS idx_equipes_tipo ON equipes_local(tipo_equipe);
CREATE INDEX IF NOT EXISTS idx_equipes_status ON equipes_local(status_composicao);
CREATE INDEX IF NOT EXISTS idx_equipes_synced ON equipes_local(synced);

-- Índices para colaboradores_local
CREATE INDEX IF NOT EXISTS idx_colaboradores_matricula ON colaboradores_local(matricula);
CREATE INDEX IF NOT EXISTS idx_colaboradores_funcao ON colaboradores_local(funcao);
CREATE INDEX IF NOT EXISTS idx_colaboradores_supervisor ON colaboradores_local(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_coordenador ON colaboradores_local(coordenador_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_synced ON colaboradores_local(synced);

-- Índices para servicos_local
CREATE INDEX IF NOT EXISTS idx_servicos_equipe_id ON servicos_local(equipe_id);
CREATE INDEX IF NOT EXISTS idx_servicos_data_planejada ON servicos_local(data_planejada);
CREATE INDEX IF NOT EXISTS idx_servicos_status ON servicos_local(status);
CREATE INDEX IF NOT EXISTS idx_servicos_equipe_prefixo ON servicos_local(equipe_prefixo);
CREATE INDEX IF NOT EXISTS idx_servicos_synced ON servicos_local(synced);

-- Índices para composicao_equipe_local
CREATE INDEX IF NOT EXISTS idx_composicao_equipe_id ON composicao_equipe_local(equipe_id);
CREATE INDEX IF NOT EXISTS idx_composicao_colaborador ON composicao_equipe_local(colaborador_matricula);
CREATE INDEX IF NOT EXISTS idx_composicao_synced ON composicao_equipe_local(synced);

-- =====================================================
-- 9. CRIAR TRIGGERS PARA UPDATED_AT
-- =====================================================
-- Trigger para equipes_local
CREATE TRIGGER IF NOT EXISTS trigger_equipes_updated_at
    AFTER UPDATE ON equipes_local
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE equipes_local 
    SET updated_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger para colaboradores_local
CREATE TRIGGER IF NOT EXISTS trigger_colaboradores_updated_at
    AFTER UPDATE ON colaboradores_local
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE colaboradores_local 
    SET updated_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger para servicos_local
CREATE TRIGGER IF NOT EXISTS trigger_servicos_updated_at
    AFTER UPDATE ON servicos_local
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE servicos_local 
    SET updated_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger para execucoes_colaborador_local
CREATE TRIGGER IF NOT EXISTS trigger_execucoes_updated_at
    AFTER UPDATE ON execucoes_colaborador_local
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE execucoes_colaborador_local 
    SET updated_at = CURRENT_TIMESTAMP, last_modified = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- =====================================================
-- 10. CRIAR VIEWS PARA COMPATIBILIDADE
-- =====================================================
-- View para equipes com informações detalhadas
CREATE VIEW IF NOT EXISTS vw_equipes_detalhadas AS
SELECT 
    e.*,
    c.nome as encarregado_nome,
    c.funcao as encarregado_funcao,
    COUNT(ce.colaborador_matricula) as total_colaboradores
FROM equipes_local e
LEFT JOIN colaboradores_local c ON e.encarregado_matricula = c.matricula
LEFT JOIN composicao_equipe_local ce ON e.id = ce.equipe_id
GROUP BY e.id, e.data, e.prefixo, e.tipo_equipe, e.status_composicao, 
         e.encarregado_matricula, c.nome, c.funcao;

-- View para serviços com informações da equipe
CREATE VIEW IF NOT EXISTS vw_servicos_detalhados AS
SELECT 
    s.*,
    e.prefixo as equipe_prefixo_real,
    e.tipo_equipe,
    e.encarregado_matricula,
    c.nome as encarregado_nome
FROM servicos_local s
LEFT JOIN equipes_local e ON s.equipe_id = e.id
LEFT JOIN colaboradores_local c ON e.encarregado_matricula = c.matricula;

-- View para colaboradores com hierarquia
CREATE VIEW IF NOT EXISTS vw_colaboradores_hierarquia AS
SELECT 
    c.*,
    s.nome as supervisor_nome,
    coord.nome as coordenador_nome
FROM colaboradores_local c
LEFT JOIN colaboradores_local s ON c.supervisor_id = s.matricula
LEFT JOIN colaboradores_local coord ON c.coordenador_id = coord.matricula;

-- =====================================================
-- 11. INSERIR DADOS DE TESTE (OPCIONAL)
-- =====================================================
-- Inserir tipos de equipe padrão se não existirem
INSERT OR IGNORE INTO grupo_itens_local (id, nome, unidade) VALUES 
('TIPO_EQUIPE_LV', 'Linha Viva', 'UN'),
('TIPO_EQUIPE_LM', 'Linha Morta', 'UN'),
('TIPO_EQUIPE_PODA', 'Poda', 'UN'),
('TIPO_EQUIPE_LM_LEVE', 'Linha Morta Leve', 'UN');

-- =====================================================
-- 12. REGISTRAR VERSÃO DA MIGRAÇÃO
-- =====================================================
INSERT INTO schema_version (version, description) 
VALUES (1, 'Migração crítica: correção de estruturas de tabelas, adição de campos de auditoria, criação de execucoes_colaborador_local, índices e triggers');

-- =====================================================
-- 13. VERIFICAÇÕES FINAIS
-- =====================================================
-- Verificar integridade das tabelas
PRAGMA integrity_check;

-- Verificar estrutura das tabelas principais
.schema equipes_local
.schema colaboradores_local
.schema servicos_local
.schema execucoes_colaborador_local

-- Contar registros migrados
SELECT 'equipes_local' as tabela, COUNT(*) as registros FROM equipes_local
UNION ALL
SELECT 'colaboradores_local' as tabela, COUNT(*) as registros FROM colaboradores_local
UNION ALL
SELECT 'servicos_local' as tabela, COUNT(*) as registros FROM servicos_local
UNION ALL
SELECT 'execucoes_colaborador_local' as tabela, COUNT(*) as registros FROM execucoes_colaborador_local;

-- Verificar versão final
SELECT version, description, applied_at 
FROM schema_version 
ORDER BY version DESC 
LIMIT 1;

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA
-- =====================================================
-- Status: ✅ SUCESSO
-- Próximos passos:
-- 1. Testar operações CRUD em todas as tabelas
-- 2. Verificar sincronização com servidor
-- 3. Implementar validações no código TypeScript
-- 4. Executar testes de integração
-- =====================================================