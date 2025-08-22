# 🔧 Configuração do ADB no Windows

## 📋 Problema Identificado

O script de testes offline falha porque o comando `adb` (Android Debug Bridge) não está configurado no PATH do sistema Windows.

## ✅ Solução Completa

### 1️⃣ Instalar Android Studio

1. **Baixar Android Studio:**
   - Acesse: https://developer.android.com/studio
   - Baixe e instale a versão mais recente

2. **Durante a instalação:**
   - ✅ Marque "Android SDK"
   - ✅ Marque "Android SDK Platform-Tools"
   - ✅ Marque "Android Virtual Device"

### 2️⃣ Localizar o ADB

Após a instalação, o ADB estará em:
```
C:\Users\[SEU_USUARIO]\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

### 3️⃣ Adicionar ao PATH (Método Visual)

1. **Abrir Configurações do Sistema:**
   - Pressione `Win + R`
   - Digite: `sysdm.cpl`
   - Pressione Enter

2. **Configurar Variáveis de Ambiente:**
   - Clique em "Variáveis de Ambiente"
   - Em "Variáveis do sistema", encontre "Path"
   - Clique em "Editar"
   - Clique em "Novo"
   - Adicione: `C:\Users\[SEU_USUARIO]\AppData\Local\Android\Sdk\platform-tools`
   - Substitua `[SEU_USUARIO]` pelo seu nome de usuário

3. **Aplicar Mudanças:**
   - Clique "OK" em todas as janelas
   - **Reinicie o terminal/PowerShell**

### 4️⃣ Adicionar ao PATH (Método PowerShell)

```powershell
# Verificar usuário atual
$env:USERNAME

# Adicionar ao PATH permanentemente
$androidSdk = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$androidSdk", "User")

# Recarregar variáveis de ambiente
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 5️⃣ Verificar Instalação

```powershell
# Testar ADB
adb version

# Listar dispositivos conectados
adb devices

# Se aparecer "List of devices attached" = ✅ Funcionando!
```

## 🚀 Testando os Scripts

Após configurar o ADB:

```powershell
# Testar simulação offline
npm run test:simulate-offline

# Testar simulação online  
npm run test:simulate-online

# Executar cenários completos
npm run test:offline
```

## 🔍 Solução de Problemas

### Problema: "adb não é reconhecido"

**Causa:** ADB não está no PATH

**Solução:**
1. Verificar se o caminho existe:
   ```powershell
   Test-Path "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe"
   ```

2. Se não existir, reinstalar Android Studio

3. Se existir, repetir configuração do PATH

### Problema: "No devices/emulators found"

**Causa:** Emulador não está rodando

**Solução:**
1. Abrir Android Studio
2. Tools > AVD Manager
3. Criar/iniciar um emulador
4. Testar: `adb devices`

### Problema: "Device unauthorized"

**Causa:** Emulador não autorizou o ADB

**Solução:**
```powershell
# Reiniciar servidor ADB
adb kill-server
adb start-server

# Aceitar autorização no emulador
adb devices
```

## 🎯 Alternativas Manuais

Se o ADB não funcionar, você pode testar offline manualmente:

### No Emulador Android:
1. Settings > Network & Internet
2. Airplane mode > ON (para offline)
3. Airplane mode > OFF (para online)

### No Android Studio:
1. Extended Controls (ícone "...") 
2. Cellular > Signal status
3. "None" (para offline)
4. "Full" (para online)

## 📱 Testando no Aplicativo

Com ou sem ADB, você pode usar o painel de testes:

1. Abrir o app
2. Ir para tela de Debug
3. Usar o "Painel de Testes Offline"
4. Simular cenários diretamente no app

## ✨ Próximos Passos

Após configurar o ADB:

1. ✅ Executar `npm run test:offline`
2. ✅ Verificar logs em `logs/offline-tests.log`
3. ✅ Testar sincronização manual
4. ✅ Validar dados offline no app

---

**💡 Dica:** Mantenha o Android Studio atualizado para evitar problemas de compatibilidade com o ADB.