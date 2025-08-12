# Sistema de Faturamento - Conexão com GIServico

## Estrutura da Tabela GIServico
```sql
id, id_servico, id_item, n_serie, status, prefixo, created_at, quantidade
5,  3,         16,      SERIE001, Instalado, 756006A, 2025-08-01 17:50:36.532827+00, 1
```

## Como Funciona a Conexão

### 1. Estrutura das Tabelas de Faturamento

#### `valores_faturamento`
- **grupo**: Categoria do item (ex: "TRANSFORMADOR", "Elos fusíveis")
- **item**: Nome específico do item ou "todos" para valor genérico
- **status**: "Instalado" ou "Retirado"
- **tipo_servico**: "Normal", "Substituição", "Com_Aparelhagem", "Sem_Aparelhagem"
- **valor_unitario**: Valor por unidade

#### `faturamento_servicos`
- Resume o faturamento total de um serviço
- Conecta com `servicos.id` através de `servico_id`

#### `detalhes_faturamento`
- Detalha cada item faturado
- Conecta com `giservico.id` através de `giservico_id`

### 2. Lógica de Conexão

#### Passo 1: Buscar Itens Executados
```sql
SELECT g.*, gi.grupo, gi.item 
FROM giservico g
JOIN grupo_itens gi ON g.id_item = gi.id
WHERE g.id_servico = [ID_DO_SERVICO]
```

#### Passo 2: Determinar o Tipo de Serviço
Para cada item em `giservico`, o sistema precisa determinar o `tipo_servico`:

**Opção A: Campo Adicional na Tabela GIServico**
```sql
ALTER TABLE giservico ADD COLUMN tipo_servico text DEFAULT 'Normal';
```

**Opção B: Lógica Baseada no Contexto do Serviço**
- Analisar a descrição do serviço
- Verificar se há múltiplos itens do mesmo tipo (indicando substituição)
- Usar regras de negócio específicas

**Opção C: Interface do Usuário**
- Permitir que o usuário selecione o tipo de serviço ao executar o item
- Adicionar campo no modal de checklist

### 3. Exemplo de Cálculo de Faturamento

#### Cenário: Substituição de Transformador
```
GIServico:
- Item 1: Transformador 15kVA, Status: "Retirado", Quantidade: 1
- Item 2: Transformador 25kVA, Status: "Instalado", Quantidade: 1
```

#### Busca de Valores:
1. **Retirado**: `grupo="TRANSFORMADOR", item="Transformador 15kVA", status="Retirado", tipo_servico="Substituição"` → R$ 400,00
2. **Instalado**: `grupo="TRANSFORMADOR", item="Transformador 25kVA", status="Instalado", tipo_servico="Substituição"` → R$ 600,00

#### Resultado:
- **Valor Total Retirado**: R$ 400,00
- **Valor Total Instalado**: R$ 600,00
- **Valor Total Geral**: R$ 1.000,00

### 4. Implementação Recomendada

#### Opção 1: Campo Adicional (Mais Simples)
```sql
-- Adicionar campo tipo_servico na tabela giservico
ALTER TABLE giservico ADD COLUMN tipo_servico text DEFAULT 'Normal' 
CHECK (tipo_servico IN ('Normal', 'Substituição', 'Com_Aparelhagem', 'Sem_Aparelhagem'));
```

#### Opção 2: Tabela de Contexto de Serviço
```sql
-- Criar tabela para definir o contexto do serviço
CREATE TABLE contexto_servico (
    id SERIAL PRIMARY KEY,
    servico_id integer REFERENCES servicos(id),
    tipo_operacao text CHECK (tipo_operacao IN ('Instalação', 'Retirada', 'Substituição', 'Manutenção')),
    inclui_aparelhagem boolean DEFAULT true,
    observacoes text
);
```

#### Opção 3: Lógica Automática
```javascript
// Função para determinar tipo de serviço automaticamente
function determinarTipoServico(servicoId, grupo, status) {
    // Se é transformador e há itens instalados E retirados = Substituição
    if (grupo === 'TRANSFORMADOR') {
        const itensServico = getItensPorServico(servicoId, grupo);
        const temInstalado = itensServico.some(i => i.status === 'Instalado');
        const temRetirado = itensServico.some(i => i.status === 'Retirado');
        
        if (temInstalado && temRetirado) {
            return 'Substituição';
        }
    }
    
    // Verificar descrição do serviço para palavras-chave
    const descricaoServico = getDescricaoServico(servicoId);
    if (descricaoServico.includes('substituição') || descricaoServico.includes('troca')) {
        return 'Substituição';
    }
    
    return 'Com_Aparelhagem'; // Padrão para instalação/retirada completa
}
```

### 5. Fluxo de Faturamento

1. **Execução do Serviço**: Itens são registrados na tabela `giservico`
2. **Cálculo de Faturamento**: 
   - Sistema busca todos os itens executados
   - Para cada item, determina o `tipo_servico`
   - Busca o valor correspondente em `valores_faturamento`
   - Calcula o valor total (valor_unitario × quantidade)
3. **Registro do Faturamento**:
   - Cria/atualiza registro em `faturamento_servicos`
   - Cria registros em `detalhes_faturamento`

### 6. Consultas Úteis

#### Buscar Valor de Faturamento
```sql
-- Busca valor específico, se não encontrar, busca genérico
SELECT valor_unitario 
FROM valores_faturamento 
WHERE grupo = 'TRANSFORMADOR' 
  AND (item = 'Transformador 15kVA' OR item = 'todos')
  AND status = 'Instalado'
  AND tipo_servico = 'Substituição'
  AND ativo = true
ORDER BY CASE WHEN item = 'Transformador 15kVA' THEN 1 ELSE 2 END
LIMIT 1;
```

#### Calcular Faturamento de um Serviço
```sql
SELECT 
    s.id as servico_id,
    s.descricao,
    SUM(CASE WHEN g.status = 'Instalado' THEN vf.valor_unitario * g.quantidade ELSE 0 END) as valor_instalado,
    SUM(CASE WHEN g.status = 'Retirado' THEN vf.valor_unitario * g.quantidade ELSE 0 END) as valor_retirado
FROM servicos s
JOIN giservico g ON s.id = g.id_servico
JOIN grupo_itens gi ON g.id_item = gi.id
LEFT JOIN valores_faturamento vf ON (
    vf.grupo = gi.grupo 
    AND (vf.item = gi.item OR vf.item = 'todos')
    AND vf.status = g.status
    AND vf.tipo_servico = COALESCE(g.tipo_servico, 'Normal')
    AND vf.ativo = true
)
WHERE s.id = [ID_DO_SERVICO]
GROUP BY s.id, s.descricao;
```

## Recomendação Final

Para sua implementação, recomendo a **Opção 1** (adicionar campo `tipo_servico` na tabela `giservico`) por ser:
- Mais simples de implementar
- Mais flexível para o usuário
- Mais fácil de manter
- Permite controle granular por item

O campo pode ser preenchido automaticamente com "Normal" e permitir alteração manual quando necessário.