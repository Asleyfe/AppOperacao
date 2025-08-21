# Plano de Ação para Robustez da Arquitetura Offline-First

## 📋 Diagnóstico Geral

A arquitetura offline-first é bem estruturada e funcional em seu núcleo. No entanto, a análise aprofundada do código revelou **pontos críticos de risco** que podem levar a **perda de dados silenciosa, inconsistências e bugs** para os encarregados.

A causa raiz da maioria dos problemas é que a lógica de sincronização (`syncService`) e a fila de operações (`QueueService`) **não utilizam o `ConflictResolver`**, que já está implementado, resultando em uma estratégia de "o último a escrever vence" sem validação.

---

## 💣 Principais Riscos e Potenciais Bugs

1.  **[RISCO ALTO] Perda de Dados por Sobrescrita:**
    *   **Cenário:** Um encarregado edita um serviço offline. Ao mesmo tempo, um gestor edita o mesmo serviço no sistema web. Quando o encarregado fica online, sua versão **sobrescreve** a do gestor, perdendo as alterações feitas.
    *   **Causa:** `syncService` e `QueueService` usam `supabase.upsert()` e `supabase.update()` diretamente, sem antes verificar conflitos com os dados do servidor.

2.  **[RISCO MÉDIO] Dados "Fantasma" no Dispositivo:**
    *   **Cenário:** Um serviço é excluído no sistema web. No entanto, ele **permanece visível** no aplicativo do encarregado indefinidamente, pois não há sincronização de exclusões.
    *   **Causa:** A lógica de `syncFromServer` apenas insere ou atualiza registros (`INSERT OR REPLACE`), mas nunca remove registros que foram deletados no servidor.

3.  **[RISCO MÉDIO] Loop Infinito de Operações Falhas:**
    *   **Cenário:** Uma operação offline falha ao ser enviada ao servidor (ex: violação de uma regra de negócio). O `QueueService` tentará reenviar essa operação **infinitamente** toda vez que o app ficar online, consumindo recursos e potencialmente bloqueando outras operações.
    *   **Causa:** O `QueueService` incrementa o número de tentativas, mas não existe um limite máximo para parar de tentar e marcar a operação como falha permanente.

4.  **[RISCO BAIXO] Inconsistência de Dados por Fuso Horário:**
    *   **Cenário:** No final ou início do dia, um encarregado pode não ver todos os serviços planejados para a data atual.
    *   **Causa:** A query em `OfflineDataService` para buscar serviços do dia (`WHERE DATE(s.data_planejada) = ?`) é sensível a configurações de fuso horário do dispositivo e do servidor, podendo resultar em inconsistências.

---

## 🛠️ Plano de Ação Corretivo

O foco é integrar os serviços existentes para que funcionem em harmonia, com o mínimo de código novo.

### Fase 1: Integração do `ConflictResolver` (Prioridade Alta)

**Objetivo:** Eliminar o risco de perda de dados.

1.  **Modificar `syncService.ts`:**
    *   Antes de executar o `supabase.upsert()`, o serviço **deve** primeiro buscar a versão atual do registro no servidor.
    *   Comparar o registro local (`servico`) com o do servidor usando o `ConflictResolver.resolveConflict(local, server)`.
    *   Enviar para o Supabase apenas o `resolvedData` retornado pelo resolvedor.
    *   Logar o conflito usando `ConflictResolver.logConflict()` se `hasConflict` for `true`.

    **Exemplo de implementação em `syncToServer`:**
    ```typescript
    // Dentro do loop 'for (const servico of servicosToSync)'
    
    // 1. Buscar versão do servidor
    const { data: serverServico } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', servico.id)
      .single();

    if (serverServico) {
      // 2. Resolver conflito se existir
      const resolver = new ConflictResolver();
      const resolution = resolver.resolveConflict(servico, serverServico, 'last_modified');

      if (resolution.hasConflict) {
        await ConflictResolver.logConflict({
          tableName: 'servicos',
          recordId: servico.id,
          resolution: resolution.strategy,
          winner: resolution.resolvedData,
          loser: resolution.resolvedData.id === servico.id ? serverServico : servico,
        });
      }
      
      // 3. Enviar o dado resolvido
      const { error } = await supabase.from('servicos').upsert(resolution.resolvedData);
      // ... resto da lógica
    } else {
      // Se não existe no servidor, é um novo registro, pode inserir direto
      const { error } = await supabase.from('servicos').insert(servico);
      // ...
    }
    ```

2.  **Modificar `QueueService.ts`:**
    *   Aplicar a **mesma lógica** descrita acima dentro do `executeOperation`. Antes de um `UPDATE`, buscar a versão do servidor, resolver o conflito e então executar a operação com os dados resolvidos.

### Fase 2: Melhorar a Fila e Sincronização (Prioridade Média)

**Objetivo:** Aumentar a resiliência do sistema.

1.  **Implementar Limite de Tentativas no `QueueService.ts`:**
    *   Adicionar uma verificação no `incrementAttempts`. Se `attempts + 1` exceder um limite (ex: 5), mudar o status da operação para `'FAILED'`.
    *   No `processQueue`, ignorar operações com status `'FAILED'`.

2.  **Implementar Sincronização de Exclusões:**
    *   Esta é a parte mais complexa. Uma estratégia comum é usar "soft deletes" (marcar um registro como `deleted_at` em vez de removê-lo).
    *   **No Supabase:** Adicionar uma coluna `deleted_at` às tabelas. Em vez de `DELETE`, a aplicação web faria um `UPDATE` para setar esta data.
    *   **No `syncFromServer`:** Sincronizar os registros que têm `deleted_at` preenchido e removê-los do SQLite local.

### Fase 3: Refinamentos e Testes (Contínuo)

**Objetivo:** Garantir a estabilidade e a qualidade do código.

1.  **Refatorar `OfflineDataService.ts`:**
    *   Remover a função `getServicos` duplicada.
    *   Padronizar o mapeamento de dados entre `getServicos` e `getServicosByEncarregado` para evitar inconsistências na UI.
    *   Para a query de data, considere buscar os serviços em um intervalo de tempo maior (ex: D-1, D, D+1) e fazer o filtro final no lado do cliente para mitigar problemas de fuso horário.

2.  **Implementar Testes Automatizados:**
    *   Como já recomendado, criar testes unitários e de integração é **crucial**.
    *   **Cenários de teste prioritários:**
        *   Um registro é modificado offline e sincronizado com sucesso.
        *   Um conflito de dados ocorre e é resolvido corretamente pela estratégia `last_modified`.
        *   Uma operação na fila falha 5 vezes e é marcada como `'FAILED'`.
        *   Um registro deletado no servidor é removido do app local após a sincronização.

---

## 🔚 Conclusão

Sua implementação offline está a um passo de ser excelente. Ao focar em **integrar o `ConflictResolver`** e adicionar **resiliência ao `QueueService`**, você eliminará os riscos mais graves e garantirá que os encarregados possam trabalhar offline com segurança e sem perda de dados.
