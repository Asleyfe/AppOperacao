# Configuração de Rota Padrão para Mobile

## Objetivo
Definir uma rota padrão que sempre acesse primeiramente a página de login e depois a página de equipe no aplicativo mobile React Native.

## Implementação

### 1. Layout Principal (`app/_layout.tsx`)
- Configurado para sempre verificar o estado de autenticação
- Se não autenticado: redireciona para `/login`
- Se autenticado: redireciona para `/(tabs)/` (página de equipe)

### 2. Configuração do App (`app.config.js`)
- Adicionada propriedade `initialRouteName: 'login'`
- Garante que o app sempre inicie na tela de login

### 3. Tela de Login (`app/login.tsx`)
- Após login bem-sucedido, redireciona para `/(tabs)/`
- A primeira tab é automaticamente a página de equipe (`index.tsx`)

### 4. Layout das Tabs (`app/(tabs)/_layout.tsx`)
- A primeira tab screen é `index` (página de equipe)
- Configurada com título "Equipe" e ícone de usuários

## Fluxo de Navegação

```
Início do App
     ↓
  Login Screen
     ↓
(após autenticação)
     ↓
  Tabs Layout
     ↓
 Página de Equipe (index)
```

## Características para Mobile

### React Native + Expo Router
- Utiliza file-based routing do Expo Router
- Navegação nativa otimizada para mobile
- Suporte a deep linking
- Transições suaves entre telas

### Autenticação Persistente
- Hook `useAuth` gerencia estado de autenticação
- Sessão persistente com Supabase
- Redirecionamento automático baseado no estado

### Componente AuthGuard
- Protege rotas que requerem autenticação
- Exibe loading durante verificação
- Redireciona automaticamente se não autenticado

## Benefícios

1. **Segurança**: Sempre verifica autenticação antes de acessar conteúdo
2. **UX Consistente**: Fluxo previsível para o usuário
3. **Performance**: Carregamento otimizado das telas
4. **Manutenibilidade**: Lógica centralizada de roteamento

## Compatibilidade

- ✅ iOS
- ✅ Android
- ✅ Web (através do Expo)
- ✅ Deep linking
- ✅ Navigation state persistence

## Observações

- A página de equipe (`index.tsx`) é sempre a primeira tab acessível
- O sistema respeita permissões de usuário (encarregados têm acesso limitado)
- Logout redireciona automaticamente para login
- Estado de loading é tratado adequadamente