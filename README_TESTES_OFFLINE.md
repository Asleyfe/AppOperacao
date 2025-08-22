# 🧪 Testes Offline - Guia Prático

## 📖 Visão Geral

Este guia fornece instruções práticas para realizar testes offline no emulador do seu aplicativo. Foram criadas várias ferramentas para facilitar a simulação e teste de cenários offline.

---

## 🛠️ Ferramentas Disponíveis

### 1. 📋 Guia Completo (`GUIA_TESTES_OFFLINE_EMULADOR.md`)
Documentação detalhada com teoria e estratégias de teste offline.

### 2. 🤖 Script Automatizado (`scripts/test-offline.js`)
Script Node.js para automação de testes offline via linha de comando.

### 3. 📱 Painel Visual (`components/debug/OfflineTestPanel.tsx`)
Componente React Native para testes offline diretamente no app.

### 4. ⚡ Scripts NPM (package.json)
Comandos rápidos para execução de testes.

---

## 🚀 Como Usar

### Método 1: Scripts NPM (Recomendado)

```bash
# Ver todos os comandos disponíveis
npm run test:offline:help

# Executar cenários completos de teste
npm run test:offline

# Simular modo offline
npm run test:offline:simulate-offline

# Simular modo online
npm run test:offline:simulate-online

# Criar dados de teste
npm run test:offline:create-data

# Monitorar sincronização
npm run test:offline:monitor

# Limpar banco de dados local
npm run test:offline:reset

# Gerar relatório de teste
npm run test:offline:report
```

### Método 2: Script Direto

```bash
# Executar script diretamente
node scripts/test-offline.js [comando]

# Exemplos:
node scripts/test-offline.js simulate-offline
node scripts/test-offline.js run-scenarios
node scripts/test-offline.js help
```

### Método 3: Painel Visual no App

1. **Adicionar o componente em uma tela de debug:**

```typescript
// screens/DebugScreen.tsx
import React from 'react';
import { OfflineTestPanel } from '../components/debug/OfflineTestPanel';

export const DebugScreen = () => {
  return <OfflineTestPanel />;
};
```

2. **Ou adicionar como modal/overlay:**

```typescript
// App.tsx ou tela principal
import { OfflineTestPanel } from './components/debug/OfflineTestPanel';

// Adicionar condicionalmente em modo de desenvolvimento
{__DEV__ && <OfflineTestPanel />}
```

---

## 📋 Cenários de Teste Essenciais

### 🎯 Cenário 1: Operação Offline Básica

```bash
# 1. Simular offline
npm run test:offline:simulate-offline

# 2. Criar dados de teste (via app ou script)
npm run test:offline:create-data

# 3. Verificar dados no app (devem aparecer como "não sincronizados")

# 4. Simular volta da conexão
npm run test:offline:simulate-online

# 5. Monitorar sincronização
npm run test:offline:monitor
```

### 🎯 Cenário 2: Rede Instável

```bash
# Alternar entre offline/online rapidamente
npm run test:offline:simulate-offline
# Aguardar 5 segundos
npm run test:offline:simulate-online
# Aguardar 3 segundos
npm run test:offline:simulate-offline
# Aguardar 2 segundos
npm run test:offline:simulate-online
```

### 🎯 Cenário 3: Teste Completo Automatizado

```bash
# Executa cenário completo automaticamente
npm run test:offline
```

---

## 🔍 Monitoramento e Debug

### Logs do Sistema

```bash
# Android - Monitorar logs do app
adb logcat | grep -E "(OFFLINE|SYNC|NETWORK)"

# Ou usar o script de monitoramento
npm run test:offline:monitor
```

### Verificação Manual no App

1. **Indicadores Visuais:**
   - Ícone de "não sincronizado" nos itens
   - Status da conexão na barra superior
   - Contador de itens pendentes

2. **Painel de Debug:**
   - Use o `OfflineTestPanel` para monitoramento em tempo real
   - Visualize dados pendentes
   - Execute testes diretamente no app

### Verificação do Banco de Dados

```bash
# Verificar estrutura do banco (se tiver sqlite3 instalado)
sqlite3 .expo/sqlite.db ".tables"
sqlite3 .expo/sqlite.db "SELECT * FROM servicos_local WHERE synced = 0;"
```

---

## 📊 Interpretando Resultados

### ✅ Comportamento Esperado

1. **Modo Offline:**
   - Dados são salvos localmente com `synced = 0`
   - App funciona normalmente
   - Indicadores visuais mostram status "não sincronizado"

2. **Volta da Conexão:**
   - Sincronização automática é iniciada
   - Dados são enviados ao servidor
   - Status muda para `synced = 1`
   - Indicadores visuais são atualizados

3. **Conflitos:**
   - Sistema detecta conflitos
   - Aplica estratégia de resolução (último vence, merge, etc.)
   - Logs mostram detalhes da resolução

### ❌ Problemas Comuns

1. **Dados não são salvos offline:**
   - Verificar se `OfflineDataService` está sendo usado
   - Verificar logs de erro no console
   - Verificar se tabelas locais existem

2. **Sincronização não funciona:**
   - Verificar conexão com internet
   - Verificar credenciais do Supabase
   - Verificar logs do `NetworkService`

3. **App trava em modo offline:**
   - Verificar se todas as operações têm fallback offline
   - Verificar timeouts de rede
   - Verificar tratamento de erros

---

## 🔧 Configuração do Ambiente

### Pré-requisitos

```bash
# Android SDK e ADB configurados
adb devices  # Deve mostrar seu emulador

# Node.js instalado
node --version

# Dependências do projeto instaladas
npm install
```

### Configuração do Emulador

#### Android Studio
```bash
# Iniciar emulador com configurações específicas
emulator -avd Pixel_7_API_34 -netdelay none -netspeed full

# Para rede lenta (opcional)
emulator -avd Pixel_7_API_34 -netdelay gprs -netspeed edge
```

#### iOS Simulator
1. Abrir Simulator
2. Device > Network Link Conditioner
3. Escolher perfil de rede desejado

### Variáveis de Ambiente

```bash
# .env.test (opcional)
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_OFFLINE_MODE=true
EXPO_PUBLIC_DEBUG_LOGS=true
```

---

## 📚 Recursos Adicionais

### Documentação
- [Guia Completo de Testes Offline](./GUIA_TESTES_OFFLINE_EMULADOR.md)
- [Documentação do NetInfo](https://github.com/react-native-netinfo/react-native-netinfo)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)

### Ferramentas Externas
- **Charles Proxy**: Para interceptação de rede
- **Flipper**: Debug avançado para React Native
- **Reactotron**: Monitoramento de estado

### Arquivos de Log
- `logs/offline-tests.log`: Logs dos scripts de teste
- `reports/offline-test-report-*.json`: Relatórios de teste
- `test-data/offline-test-data.json`: Dados de teste gerados

---

## 🆘 Solução de Problemas

### Problema: "adb não encontrado"
```bash
# Adicionar Android SDK ao PATH
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Ou usar caminho completo
~/Android/Sdk/platform-tools/adb devices
```

### Problema: "Emulador não responde"
```bash
# Reiniciar ADB
adb kill-server
adb start-server

# Verificar dispositivos
adb devices
```

### Problema: "Script não executa"
```bash
# Verificar permissões (Linux/Mac)
chmod +x scripts/test-offline.js

# Executar com Node diretamente
node scripts/test-offline.js help
```

### Problema: "Banco não limpa"
```bash
# Limpar cache do Expo
npx expo r -c

# Desinstalar e reinstalar app no emulador
adb uninstall com.appoperacao.app
```

---

## 📝 Checklist de Teste

### Antes de Começar
- [ ] Emulador em execução
- [ ] ADB funcionando (`adb devices`)
- [ ] App instalado e funcionando
- [ ] Conexão com Supabase configurada

### Durante os Testes
- [ ] Testar criação offline
- [ ] Testar edição offline
- [ ] Testar sincronização
- [ ] Testar conflitos
- [ ] Testar rede instável
- [ ] Verificar indicadores visuais
- [ ] Verificar logs

### Após os Testes
- [ ] Gerar relatório
- [ ] Limpar dados de teste
- [ ] Documentar problemas encontrados
- [ ] Atualizar casos de teste

---

## 🎓 Dicas de Aprendizado

### Para Iniciantes
1. **Comece com o painel visual** - É mais intuitivo
2. **Use scripts NPM** - Mais fácil que comandos diretos
3. **Monitore logs** - Ajuda a entender o que está acontecendo
4. **Teste um cenário por vez** - Evita confusão

### Para Avançados
1. **Customize os scripts** - Adapte para suas necessidades
2. **Crie novos cenários** - Teste casos específicos do seu app
3. **Integre com CI/CD** - Automatize testes offline
4. **Use ferramentas externas** - Charles Proxy, Flipper, etc.

### Conceitos Importantes
- **Estado offline vs online**
- **Sincronização bidirecional**
- **Resolução de conflitos**
- **Fila de operações**
- **Indicadores visuais**
- **Tratamento de erros**

---

*Este guia deve ser atualizado conforme novos cenários e ferramentas são adicionados ao projeto.*