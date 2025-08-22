# Faturamento Offline - Explicação Técnica

## Como o Faturamento é Calculado Offline

### Estrutura de Dados

O sistema de faturamento offline utiliza as seguintes tabelas principais:

1. **`valores_faturamento_real_local`** - Tabela de baremos com valores unitários
2. **`servicos_local`** - Serviços executados
3. **`giservico_local`** - Itens de serviço com quantidades
4. **`grupo_itens_local`** - Catálogo de itens disponíveis

### Processo de Cálculo

O cálculo do faturamento offline é realizado no método `getFaturamentoData()` do `OfflineDataService.ts`:

```typescript
// 1. Busca os dados das tabelas relacionadas
const servicos = await safeGetAllAsync(db, 'SELECT * FROM servicos_local');
const giServicos = await safeGetAllAsync(db, 'SELECT * FROM giservico_local');
const grupoItens = await safeGetAllAsync(db, 'SELECT * FROM grupo_itens_local');
const valoresFaturamento = await safeGetAllAsync(db, 'SELECT * FROM valores_faturamento_real_local');

// 2. Calcula o valor total baseado na quantidade × valor unitário
const valor_total = (gi.quantidade || 0) * (valorFaturamento?.valor_unitario || 0);
```

### Lógica de Cálculo

1. **Busca de Dados**: O sistema carrega todos os serviços, itens de serviço, grupos de itens e valores de faturamento das tabelas locais

2. **Associação de Valores**: Para cada item de serviço (`giservico_local`), o sistema:
   - Identifica o grupo e item correspondente
   - Busca o valor unitário na tabela `valores_faturamento_real_local`
   - Multiplica a quantidade pelo valor unitário

3. **Agregação**: Os valores são somados para gerar o faturamento total por serviço

## Views de Faturamento - Versão Local

### Status das Views

❌ **`vw_faturamento_real` NÃO possui versão local implementada**

Segundo a análise do schema offline:
- A view `vw_faturamento_real` existe apenas no banco online (Supabase)
- No banco offline (SQLite), o cálculo é feito programaticamente no método `getFaturamentoData()`
- A tabela base `valores_faturamento_real_local` está implementada e sincronizada

### Diferenças entre Online e Offline

| Aspecto | Online (Supabase) | Offline (SQLite) |
|---------|-------------------|------------------|
| **View vw_faturamento_real** | ✅ Implementada | ❌ Não implementada |
| **View vw_resumo_faturamento_real** | ✅ Implementada | ❌ Não implementada |
| **Tabela valores_faturamento_real** | ✅ Disponível | ✅ Sincronizada como `valores_faturamento_real_local` |
| **Cálculo** | Via SQL Views | Via código TypeScript |

### Implementação Atual

O sistema offline substitui as views SQL por lógica programática:

```typescript
// Equivalente à vw_faturamento_real
const faturamentoData = servicos.map(servico => {
  const itensServico = giServicos.filter(gi => gi.id_servico === servico.id);
  
  return itensServico.map(gi => {
    const grupoItem = grupoItens.find(item => item.id === gi.id_item);
    const valorFaturamento = valoresFaturamento.find(vf => 
      vf.grupo === grupoItem?.grupo && 
      vf.item === grupoItem?.item && 
      vf.status === gi.status
    );
    
    return {
      ...gi,
      valor_unitario: valorFaturamento?.valor_unitario || 0,
      valor_total: (gi.quantidade || 0) * (valorFaturamento?.valor_unitario || 0)
    };
  });
});
```

## Logs Implementados

### Logs de Carregamento

Os seguintes logs foram implementados para monitorar o carregamento dos dados de faturamento:

1. **OfflineDataService.ts - getValoresFaturamento()**:
   - Total de registros carregados
   - Distribuição por grupo
   - Exemplos de valores cadastrados
   - Alertas quando não há dados

2. **syncService.ts - syncFromServer()**:
   - Sincronização dos valores do servidor
   - Quantidade de registros sincronizados
   - Status da sincronização

3. **syncService.ts - logLocalTablesData()**:
   - Resumo dos dados de faturamento locais
   - Estatísticas por grupo
   - Primeiros registros como exemplo

### Exemplo de Log

```
💰 ===== VALORES FATURAMENTO REAL LOCAL =====
📊 Total de registros carregados: 150
📋 Distribuição por grupo:
   • GRUPO_A: 45 registros (12 itens únicos)
   • GRUPO_B: 38 registros (8 itens únicos)
   • GRUPO_C: 67 registros (15 itens únicos)
💵 Exemplos de valores cadastrados:
   • GRUPO_A | ITEM_001 | ATIVO = R$ 25.50
   • GRUPO_A | ITEM_002 | ATIVO = R$ 18.75
   ... e mais 148 registros
===============================================
```

## Recomendações

### Para Melhorar a Performance

1. **Implementar Views SQLite**: Criar views locais equivalentes às views online
2. **Indexação**: Adicionar índices nas colunas de busca (grupo, item, status)
3. **Cache**: Implementar cache dos valores de faturamento em memória

### Para Melhorar a Consistência

1. **Validação**: Adicionar validação dos dados antes do cálculo
2. **Logs de Erro**: Implementar logs detalhados para casos de valores não encontrados
3. **Sincronização**: Garantir que a sincronização dos valores seja executada regularmente

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0  
**Autor**: Sistema de Documentação Automática