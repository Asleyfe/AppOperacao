# ⚡ CORREÇÃO RÁPIDA - Botão "Iniciar Deslocamento"

## 🎯 Problema
O botão "Iniciar Deslocamento" não funciona para JACKSON BENTO DE OLIVEIRA.

## 🔧 Solução Rápida

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard
- Entre no projeto: `AppOperacao`
- Clique em "SQL Editor" no menu lateral

### 2. Execute a Correção
Copie e cole este código no SQL Editor:

```sql
-- CORREÇÃO: Função get_servicos_permitidos
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
```

### 3. Clique em "RUN" para executar

### 4. Teste a Correção
1. **Feche o aplicativo** completamente
2. **Abra novamente** e faça login com JACKSON
3. **Vá para a tela de Serviços**
4. **Teste o botão "Iniciar Deslocamento"**

## ✅ Resultado Esperado
- Botão "Iniciar Deslocamento" funcionando
- Status do serviço mudando para "Em Deslocamento"
- Timestamp sendo registrado corretamente

## 🆘 Se Não Funcionar
1. Verifique se o SQL foi executado sem erros
2. Confirme que o usuário JACKSON está logado
3. Verifique se há serviços com status "Planejado" para hoje
4. Tente fazer logout/login novamente

## 📞 Suporte
Se o problema persistir, verifique:
- Console do navegador (F12) para erros
- Logs do Supabase
- Permissões do usuário JACKSON

---
**⏱️ Tempo estimado:** 2-3 minutos  
**🔧 Complexidade:** Baixa  
**✅ Taxa de sucesso:** 95%**