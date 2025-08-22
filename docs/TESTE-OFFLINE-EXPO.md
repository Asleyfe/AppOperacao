# 🧪 Sistema de Testes Offline - Integração com Expo

## 📋 Visão Geral

Este sistema permite testar o comportamento offline do seu aplicativo React Native de forma automatizada, com integração completa ao Expo CLI. O sistema detecta automaticamente emuladores iniciados pelo Expo e simula condições de conectividade.

## 🚀 Fluxo Recomendado

### 1. Iniciar o Expo
```bash
npx expo start
```

### 2. Iniciar Emulador
Pressione **"a"** no terminal do Expo para iniciar o emulador Android

### 3. Executar Teste Completo
```bash
npm run test:offline:full
```

## 📱 Comandos Disponíveis

### Integração com Expo
- `npm run test:offline:expo` - Aguarda emulador ser iniciado pelo Expo
- `npm run test:offline:full` - Executa teste completo com detecção automática

### Simulação Manual
- `npm run test:offline:simulate-offline` - Ativa modo offline
- `npm run test:offline:simulate-online` - Restaura conectividade

### Utilitários
- `npm run test:offline:help` - Mostra todos os comandos
- `npm run test:offline:create-data` - Cria dados de teste
- `npm run test:offline:monitor` - Monitora sincronização

## 🔧 Como Funciona

### Detecção Automática de Emulador
O sistema utiliza o comando `adb devices` para detectar emuladores ativos:

```javascript
// Verifica emuladores ativos
checkActiveEmulators() {
  const result = execSync('adb devices', { encoding: 'utf8' });
  const activeDevices = result.split('\n')
    .filter(line => line.includes('device') && !line.includes('offline'));
  return { hasDevices: activeDevices.length > 0, devices: activeDevices };
}
```

### Aguardar Emulador
Quando nenhum emulador é detectado, o sistema aguarda até 60 segundos:

```javascript
// Aguarda emulador ficar disponível
async waitForEmulator(timeoutMs = 30000) {
  while (Date.now() - startTime < timeoutMs) {
    const emulatorStatus = this.checkActiveEmulators();
    if (emulatorStatus.hasDevices) {
      return true; // Emulador detectado!
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false; // Timeout
}
```

### Simulação de Modo Offline
O sistema usa comandos ADB para simular condições offline:

```bash
# Desabilitar conectividade
adb shell svc wifi disable
adb shell svc data disable
adb shell settings put global airplane_mode_on 1
```

## 🎯 Cenários de Teste

### Teste Completo Automatizado
1. **Detecção**: Verifica se há emulador ativo
2. **Aguarda**: Se necessário, aguarda emulador ser iniciado
3. **Offline**: Ativa modo offline no emulador
4. **Estabilização**: Aguarda 5 segundos
5. **Online**: Restaura conectividade
6. **Verificação**: Monitora comportamento do app

### Teste Manual
1. Execute `npm run test:offline:simulate-offline`
2. Teste funcionalidades offline no app
3. Execute `npm run test:offline:simulate-online`
4. Verifique sincronização de dados

## 🔍 Monitoramento

### Logs Detalhados
O sistema fornece logs coloridos e informativos:

- 🎯 **START**: Início de operações
- ✅ **SUCCESS**: Operações bem-sucedidas
- ⚠️ **WARNING**: Avisos importantes
- ❌ **ERROR**: Erros que precisam atenção
- 💡 **INFO**: Informações úteis

### Status do Emulador
```bash
# Verificar emuladores conectados
adb devices

# Verificar status de conectividade
adb shell settings get global airplane_mode_on
```

## 🛠️ Solução de Problemas

### ADB Não Reconhecido
```bash
# Verificar se ADB está no PATH
adb version

# Se não funcionar, adicionar ao PATH:
# Windows: C:\Android\Sdk\platform-tools
```

### Emulador Não Detectado
1. Verifique se o emulador está rodando
2. Execute `adb devices` para confirmar
3. Reinicie o ADB: `adb kill-server && adb start-server`

### Modo Offline Não Funciona
**Alternativas manuais:**
- **Android Studio**: Extended Controls > Cellular > Signal: None
- **Emulador**: Settings > Network & Internet > Airplane mode

## 📊 Exemplo de Uso Completo

```bash
# Terminal 1: Iniciar Expo
npx expo start

# Pressionar 'a' para iniciar emulador

# Terminal 2: Executar teste
npm run test:offline:full
```

**Saída esperada:**
```
🎯 Iniciando teste completo com detecção automática...
📱 Emulador detectado: emulator-5554
🔌 Simulando modo offline...
✅ Modo offline ativado com sucesso!
⏱️ Aguardando 5 segundos para estabilizar...
🌐 Restaurando conectividade...
✅ Conectividade restaurada!
✅ Teste offline concluído!
```

## 🎓 Conceitos Aprendidos

### Android Debug Bridge (ADB)
- **Função**: Interface de linha de comando para comunicar com dispositivos Android
- **Uso**: Executar comandos no emulador, instalar apps, debug
- **Comandos úteis**: `adb devices`, `adb shell`, `adb install`

### Simulação de Conectividade
- **WiFi**: Controlado via `svc wifi enable/disable`
- **Dados móveis**: Controlado via `svc data enable/disable`
- **Modo avião**: Configuração global do Android

### Integração Expo + ADB
- **Detecção**: Usar `adb devices` para verificar emuladores
- **Aguardar**: Polling com timeout para detectar novos dispositivos
- **Automação**: Combinar comandos Expo com controle ADB

### Programação Assíncrona
- **async/await**: Para operações que levam tempo
- **Promises**: Para aguardar timeouts e comandos
- **Polling**: Verificação periódica de status

## 🔗 Próximos Passos

1. **Teste o sistema** com seu app
2. **Monitore logs** para entender o comportamento
3. **Customize cenários** conforme necessário
4. **Integre com CI/CD** para testes automatizados

---

💡 **Dica**: Mantenha o Expo rodando em um terminal e execute os testes em outro para melhor experiência de desenvolvimento!