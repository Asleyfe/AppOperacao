# Sistema de Faturamento - Implementação Final

## Visão Geral

Este documento descreve a implementação completa do sistema de faturamento baseado nos dados reais fornecidos no arquivo `dados-valor`. O sistema foi projetado para calcular automaticamente o faturamento de serviços elétricos, com tratamento especial para transformadores que possuem valores diferenciados.

## Arquivos Criados

### 1. Migração do Banco de Dados
- **Arquivo**: `migrations/46_populate_faturamento_dados_reais.sql`
- **Descrição**: Cria a estrutura completa do banco de dados e popula com todos os dados reais
- **Conteúdo**:
  - Tabela `valores_faturamento_real`
  - Views inteligentes para cálculo automático
  - Dados de todos os grupos de equipamentos
  - Índices e triggers para performance

### 2. API TypeScript
- **Arquivo**: `services/faturamento-real.ts`
- **Descrição**: API completa para interação com o sistema de faturamento
- **Funcionalidades**:
  - Consultas de faturamento por serviço
  - Resumos financeiros
  - Rankings de equipes
  - Análises por grupo de equipamentos
  - Funções de manutenção

### 3. Exemplos de Consultas
- **Arquivo**: `examples/faturamento-real-examples.sql`
- **Descrição**: Conjunto abrangente de consultas SQL para diferentes cenários
- **Categorias**:
  - Consultas básicas
  - Análises por equipe
  - Relatórios financeiros
  - Verificações de auditoria
  - Consultas para dashboards

## Estrutura do Banco de Dados

### Tabela Principal: `valores_faturamento_real`

```sql
CREATE TABLE valores_faturamento_real (
    id SERIAL PRIMARY KEY,
    grupo VARCHAR(100) NOT NULL,
    item VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Instalado', 'Retirado')),
    valor_unitario DECIMAL(10,2) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UD',
    tipo_servico VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Views Inteligentes

#### 1. `vw_faturamento_real`
- Conecta dados da `giservico` com `valores_faturamento_real`
- Detecta automaticamente substituições de transformadores
- Calcula valores totais por item

#### 2. `vw_resumo_faturamento_real`
- Resumo financeiro por serviço
- Separação entre substituições e outros serviços
- Totalizadores por equipe e data

#### 3. `vw_resumo_faturamento_grupo_real`
- Análise por grupo de equipamentos
- Estatísticas de quantidade e valores
- Valores médios por categoria

## Grupos de Equipamentos Cadastrados

### 1. ISOLADOR
- Isolador Pino (13,8KV e 34,5KV)
- Isolador Roldana (13,8KV e 34,5KV)
- Isolador Suspensão (13,8KV e 34,5KV)
- **Valores**: R$ 65,49 (Instalado) / R$ 55,06 (Retirado)

### 2. PARA RAIO
- Diversas tensões (10KV a 36KV)
- **Valores**: R$ 194,38 (Instalado) / R$ 140,81 (Retirado)

### 3. CABOS MT
- Cabos de 4AWG a 336,4MCM em Cobre Alumínio
- **Valores**: R$ 32,74/m (Instalado) / R$ 23,72/m (Retirado)

### 4. CABOS BT
- Cabos de 4AWG a 336,4MCM em Alumínio
- **Valores**: R$ 16,37/m (Instalado) / R$ 11,86/m (Retirado)

### 5. ESTRUTURAS PRIMÁRIAS
- **Compacta**: C1 a C6
- **Convencional**: N1 a N6
- **Valores**: R$ 493,50 (Instalado e Retirado)

### 6. TRAFOS (Transformadores)
Sistema mais complexo com diferentes categorias:

#### Monofásicos sem aparelhagem (substituição)
- **Valores**: R$ 897,13 (Instalado) / R$ 627,99 (Retirado)

#### Bifásicos sem aparelhagem (substituição)
- **Valores**: R$ 1.146,78 (Instalado) / R$ 802,75 (Retirado)

#### Monofásicos com aparelhagem
- **Valores**: R$ 1.560,17 (Instalado) / R$ 1.092,12 (Retirado)

#### Bifásicos com aparelhagem
- **Valores**: R$ 1.867,02 (Instalado) / R$ 1.306,91 (Retirado)

#### Trifásicos sem aparelhagem
- **Valores**: R$ 2.246,54 (Instalado) / R$ 1.758,16 (Retirado)

#### Trifásicos com aparelhagem
- **Valores**: R$ 3.140,63 (Instalado) / R$ 2.198,42 (Retirado)

### 7. CHAVES
- Chave Fusível (13,8KV e 34,5KV)
- Chave Seccionadora Faca (13,8KV e 34,5KV)
- Chaves Lâmina (13,8KV e 34,5KV)
- **Valores**: Variam de R$ 140,81 a R$ 462,75

### 8. ELO FUSÍVEL
- Tipos: 1H, 2H, 3H, 5H, 6K, 8K, 10K
- **Valores**: R$ 65,49 (Instalado) / R$ 55,06 (Retirado)

### 9. ESTRUTURAS SECUNDÁRIAS
- **RD Multiplexada**: SI-1 a SI-4
- **RD Nua**: S1.4 a S4.4
- **Valores**: R$ 246,80 (Instalado e Retirado)

## Lógica Simplificada de Aparelhagem e Substituição

O sistema utiliza uma abordagem simplificada onde a aparelhagem é identificada diretamente no nome do item:

**Transformadores com Aparelhagem:**
- `TRAFO 10KVA 13,8KV 127V MONO C/APARELHAGEM`
- `TRAFO 10KVA 13,8KV 127V BI C/APARELHAGEM`
- `TRAFO 10KVA 13,8KV 127V TRI C/APARELHAGEM`

**Transformadores sem Aparelhagem:**
- `TRAFO 10KVA 13,8KV 127V MONO`
- `TRAFO 10KVA 13,8KV 127V BI`
- `TRAFO 10KVA 13,8KV 127V TRI`

**Detecção de Substituição:**
O sistema detecta automaticamente quando um transformador está sendo substituído (instalação + retirada no mesmo serviço) e aplica valores diferenciados apenas para transformadores **sem aparelhagem**:

- **Substituição (sem aparelhagem)**: Valores menores (observação: 'substituição')
- **Instalação/Retirada normal ou com aparelhagem**: Valores padrão (observação: vazia)

```sql
CASE 
    WHEN g.grupo = 'TRAFOS' AND EXISTS (
        SELECT 1 FROM giservico g2 
        WHERE g2.numero_servico = g.numero_servico 
        AND g2.grupo = 'TRAFOS' 
        AND g2.item = g.item 
        AND g2.status != g.status
    ) THEN true
    ELSE false
END as eh_substituicao_trafo
```

**Exemplo de Aplicação:**

```sql
-- Exemplo: Diferentes cenários de transformadores

-- 1. Substituição de transformador sem aparelhagem
-- Serviço 12345 tem:
-- - 1x TRAFO 10KVA 13,8KV 127V MONO (Instalado) - Valor: R$ 897,13
-- - 1x TRAFO 10KVA 13,8KV 127V MONO (Retirado) - Valor: R$ 627,99

-- 2. Instalação de transformador com aparelhagem
-- Serviço 12346 tem:
-- - 1x TRAFO 10KVA 13,8KV 127V MONO C/APARELHAGEM (Instalado) - Valor: R$ 1.560,17

SELECT 
    numero_servico,
    item,
    status,
    eh_substituicao_trafo,
    valor_unitario,
    valor_total
FROM vw_faturamento_real 
WHERE numero_servico IN ('12345', '12346')
AND item LIKE '%TRAFO%'
ORDER BY numero_servico, status;
```

## Como Usar no Aplicativo

### 1. Executar a Migração
```sql
-- Execute o arquivo de migração no banco de dados
\i migrations/46_populate_faturamento_dados_reais.sql
```

### 2. Importar o Serviço TypeScript
```typescript
import FaturamentoRealService from './services/faturamento-real';

// Buscar faturamento de um serviço
const faturamento = await FaturamentoRealService.getFaturamentoPorServico('2024001');

// Buscar resumo financeiro
const resumo = await FaturamentoRealService.getResumoFaturamentoServico('2024001');

// Ranking de equipes
const ranking = await FaturamentoRealService.getRankingEquipes('2024-01-01', '2024-12-31');
```

### 3. Exemplos de Consultas Diretas
```sql
-- Faturamento detalhado de um serviço
SELECT * FROM vw_faturamento_real WHERE numero_servico = '2024001';

-- Resumo por equipe
SELECT equipe, SUM(valor_total_servico) as total 
FROM vw_resumo_faturamento_real 
GROUP BY equipe;
```

## Funcionalidades Principais

### 1. Cálculo Automático
- ✅ Detecção automática de substituições de transformadores
- ✅ Aplicação de valores diferenciados por tipo de serviço
- ✅ Cálculo de totais por serviço e equipe
- ✅ Suporte a diferentes unidades (UD, M)

### 2. Relatórios Financeiros
- ✅ Faturamento por serviço
- ✅ Ranking de equipes
- ✅ Análise por grupo de equipamentos
- ✅ Relatórios mensais consolidados
- ✅ Estatísticas gerais

### 3. Análises Avançadas
- ✅ Identificação de substituições
- ✅ Comparação de valores por tipo de serviço
- ✅ Evolução temporal do faturamento
- ✅ Análise de produtividade por equipe

### 4. Manutenção e Auditoria
- ✅ Verificação de itens sem valor cadastrado
- ✅ Detecção de inconsistências
- ✅ Atualização de valores
- ✅ Inserção de novos equipamentos

## Vantagens da Solução

### 1. **Zero Modificações na Tabela `giservico`**
- Não requer alterações na estrutura existente
- Mantém compatibilidade com sistemas atuais
- Implementação não invasiva

### 2. **Detecção Automática Inteligente**
- Identifica substituições de transformadores automaticamente
- Aplica valores corretos baseado no tipo de serviço
- Reduz erros manuais

### 3. **Flexibilidade Total**
- Suporte a diferentes tipos de equipamentos
- Valores específicos por categoria de transformador
- Fácil adição de novos equipamentos

### 4. **Performance Otimizada**
- Views indexadas para consultas rápidas
- Estrutura normalizada
- Consultas eficientes

### 5. **Retrocompatibilidade**
- Funciona com dados históricos
- Não afeta operações existentes
- Migração transparente

### 6. **Facilidade de Manutenção**
- Interface TypeScript intuitiva
- Consultas SQL documentadas
- Estrutura modular

## Próximos Passos

### 1. Implementação
1. Executar a migração `46_populate_faturamento_dados_reais.sql`
2. Integrar o serviço `faturamento-real.ts` no aplicativo
3. Testar com dados reais
4. Configurar dashboards e relatórios

### 2. Melhorias Futuras
- Interface web para gestão de valores
- Relatórios em PDF automatizados
- Integração com sistema de pagamentos
- Alertas para valores inconsistentes
- Histórico de alterações de valores

### 3. Monitoramento
- Logs de consultas de faturamento
- Métricas de performance
- Alertas de inconsistências
- Backup automático dos dados

## Suporte e Manutenção

### Contatos
- **Desenvolvedor**: Sistema implementado via Trae AI
- **Documentação**: Este arquivo e exemplos em `examples/`
- **Código**: `services/faturamento-real.ts`

### Troubleshooting
1. **Valores não aparecem**: Verificar se o item está cadastrado em `valores_faturamento_real`
2. **Substituição não detectada**: Verificar se há instalação E retirada do mesmo item no serviço
3. **Performance lenta**: Verificar índices e otimizar consultas

---

**Sistema de Faturamento v1.0**  
*Implementado com dados reais do arquivo `dados-valor`*  
*Compatível com estrutura existente da `giservico`*