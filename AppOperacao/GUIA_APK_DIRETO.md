# 📱 Guia para Gerar APK Diretamente (Sem Google Play Store)

Este guia mostra como gerar arquivos APK que podem ser instalados diretamente no dispositivo Android, sem precisar de conta na Google Play Store.

## 🚀 **Comando Principal para APK**

```bash
# Gerar APK diretamente
eas build --platform android --profile apk
```

## 📋 **Passo a Passo Completo**

### 1. **Pré-requisitos** ✅
- [x] EAS CLI instalado: `npm install -g eas-cli`
- [x] Projeto configurado com `eas.json`
- [x] Project ID configurado no `app.config.js`

### 2. **Fazer Login no Expo**
```bash
eas login
# ou criar conta: eas register
```

### 3. **Gerar APK**
```bash
# APK para instalação direta
eas build --platform android --profile apk
```

### 4. **Aguardar o Build**
- O processo leva entre 5-15 minutos
- Você receberá um link para download do APK
- O arquivo será hospedado temporariamente no Expo

### 5. **Instalar no Dispositivo**
1. Baixe o APK do link fornecido
2. No Android, vá em **Configurações > Segurança**
3. Habilite **"Fontes desconhecidas"** ou **"Instalar apps desconhecidos"**
4. Abra o arquivo APK baixado
5. Confirme a instalação

## ⚙️ **Configurações do Projeto**

### Arquivo `eas.json` (Já configurado)
```json
{
  "build": {
    "apk": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Arquivo `app.config.js` (Já configurado)
```javascript
extra: {
  eas: {
    projectId: "da594944-0fda-4611-83d5-723514082c3a"
  }
}
```

## 🔄 **Outros Perfis de Build**

### APK de Desenvolvimento
```bash
eas build --platform android --profile development
```

### APK de Preview (Teste)
```bash
eas build --platform android --profile preview
```

### APK de Produção
```bash
eas build --platform android --profile apk
```

## 📊 **Monitorar o Build**

### Ver Status dos Builds
```bash
# Listar todos os builds
eas build:list

# Ver detalhes de um build específico
eas build:view [build-id]

# Cancelar um build
eas build:cancel [build-id]
```

### Logs do Build
```bash
# Ver logs em tempo real
eas build:view [build-id] --logs
```

## 🎯 **Vantagens do APK Direto**

✅ **Não precisa de conta Google Play**
✅ **Instalação imediata**
✅ **Controle total sobre distribuição**
✅ **Ideal para testes internos**
✅ **Sem processo de aprovação**

## 🔧 **Troubleshooting**

### Erro de Permissão no Android
```
Solução: Habilitar "Fontes desconhecidas" nas configurações
```

### Build Falhou
```bash
# Ver logs detalhados
eas build:list
eas build:view [build-id] --logs
```

### Arquivo APK Muito Grande
```bash
# Usar build otimizado
eas build --platform android --profile production
```

## 📱 **Distribuição do APK**

### Opções para Compartilhar
1. **Link direto** do Expo (temporário)
2. **Google Drive** ou **Dropbox**
3. **Servidor próprio**
4. **WhatsApp/Telegram** (arquivo direto)
5. **Email** (anexo)

### Exemplo de Distribuição
```bash
# Após o build, você receberá:
# 📱 APK: https://expo.dev/artifacts/eas/[build-id].apk
# 📋 QR Code para download direto
```

## 🔄 **Atualizações**

Para atualizar o app:
1. Incremente a versão no `app.config.js`
2. Execute novo build: `eas build --platform android --profile apk`
3. Distribua o novo APK
4. Usuários devem desinstalar a versão antiga e instalar a nova

---

**🎉 Pronto! Seu APK será gerado e você poderá instalá-lo diretamente no dispositivo Android sem precisar da Google Play Store.**