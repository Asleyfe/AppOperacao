# Solução para Problema de Logout no Android

## Problema Identificado

O aplicativo não estava redirecionando corretamente para a tela de login após o logout no Android. O problema estava relacionado à ordem de renderização e à lógica de redirecionamento no arquivo `_layout.tsx`.

## Causa Raiz

1. **Conflito de Redirecionamento**: O componente `Stack` estava sendo renderizado antes da lógica de redirecionamento, causando conflitos na navegação.
2. **Redirecionamento Manual**: O código estava tentando fazer redirecionamento manual com `router.replace('/login')` em vez de deixar o sistema de autenticação gerenciar automaticamente.
3. **Race Condition**: Havia uma condição de corrida entre o `signOut()` e o redirecionamento manual.

## Solução Implementada

### 1. Correção do `_layout.tsx`

**Antes:**
```tsx
return (
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
    {!isAuthenticated ? (
      <Redirect href="/login" />
    ) : (
      <Redirect href="/(tabs)" />
    )}
  </ThemeProvider>
);
```

**Depois:**
```tsx
// Redirecionar baseado no estado de autenticação
if (!isAuthenticated) {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Redirect href="/login" />
    </ThemeProvider>
  );
}

return (
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  </ThemeProvider>
);
```

### 2. Correção da Função `handleLogout`

**Antes:**
```tsx
try {
  await supabase.auth.signOut();
  router.replace('/login'); // Redirecionamento manual
} catch (error) {
  // ...
}
```

**Depois:**
```tsx
try {
  console.log('Iniciando logout...');
  await supabase.auth.signOut();
  console.log('Logout realizado com sucesso');
  // O redirecionamento será feito automaticamente pelo _layout.tsx
  // quando o estado de autenticação mudar
} catch (error) {
  // ...
}
```

## Como Funciona Agora

1. **Logout Iniciado**: Usuário clica no botão de logout
2. **Confirmação**: Alert é exibido para confirmar a ação
3. **SignOut**: `supabase.auth.signOut()` é executado
4. **Estado Atualizado**: O hook `useAuth` detecta a mudança via `onAuthStateChange`
5. **Redirecionamento Automático**: O `_layout.tsx` detecta `isAuthenticated = false` e redireciona para `/login`

## Benefícios da Solução

- **Consistência**: O redirecionamento funciona igual em todas as plataformas (iOS, Android, Web)
- **Confiabilidade**: Elimina race conditions entre signOut e redirecionamento
- **Manutenibilidade**: Centraliza a lógica de redirecionamento no `_layout.tsx`
- **Reatividade**: O sistema reage automaticamente às mudanças de estado de autenticação

## Fluxo de Autenticação Completo

```
App Inicia → _layout.tsx verifica isAuthenticated
    ↓
    ├─ false → Redirect para /login
    └─ true → Renderiza Stack com (tabs)

Logout Clicado → supabase.auth.signOut()
    ↓
useAuth detecta mudança → isAuthenticated = false
    ↓
_layout.tsx re-renderiza → Redirect para /login
```

## Arquivos Modificados

1. `app/_layout.tsx` - Correção da lógica de redirecionamento
2. `app/(tabs)/index.tsx` - Remoção do redirecionamento manual

## Teste da Solução

Para testar se a correção funcionou:

1. Faça login no aplicativo
2. Navegue para a tela de equipe
3. Clique no botão de logout
4. Confirme a ação no Alert
5. Verifique se o app redireciona automaticamente para a tela de login

A solução deve funcionar consistentemente em Android, iOS e Web.