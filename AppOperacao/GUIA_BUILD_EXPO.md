# 📱 Guia de Build do Aplicativo com Expo

Este guia explica como fazer o build do aplicativo **AppOperacao** usando o Expo, incluindo diferentes opções de build para desenvolvimento e produção.

## 🔧 Pré-requisitos

### 1. Configuração do Ambiente
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Supabase
```

### 2. Instalar Expo CLI (se não tiver)
```bash
npm install -g @expo/cli
```

### 3. Fazer Login no Expo
```bash
expo login
# ou criar conta: expo register
```

## 🚀 Opções de Build

### 1. Build para Desenvolvimento (Expo Go)

**Para testar no dispositivo físico:**
```bash
# Iniciar servidor de desenvolvimento
npm run dev
# ou
expo start
```

- Escaneie o QR code com o app **Expo Go** (iOS/Android)
- Ideal para desenvolvimento e testes rápidos

### 2. Build de Desenvolvimento (APK/IPA)

**Para Android (APK):**
```bash
# Build de desenvolvimento para Android
expo build:android --type apk

# Ou usando EAS Build (recomendado)
eas build --platform android --profile development
```

**Para iOS (IPA):**
```bash
# Build de desenvolvimento para iOS
expo build:ios --type simulator

# Ou usando EAS Build
eas build --platform ios --profile development
```

### 3. Build de Produção

#### Configurar EAS Build (Recomendado)

**1. Instalar EAS CLI:**
```bash
npm install -g @expo/eas-cli
```

**2. Configurar projeto:**
```bash
eas build:configure
```

**3. Builds de produção:**
```bash
# Android (AAB para Google Play)
eas build --platform android --profile production

# iOS (IPA para App Store)
eas build --platform ios --profile production

# Ambas as plataformas
eas build --platform all --profile production
```

### 4. Build para Web

```bash
# Build para web
npm run build:web
# ou
expo export --platform web

# Servir localmente para testar
npx serve dist
```

## ⚙️ Configuração Avançada

### 1. Arquivo eas.json (Criar se não existir)

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2. Configurar Variáveis de Ambiente para Build

**No arquivo app.config.js, adicione:**
```javascript
export default {
  expo: {
    // ... outras configurações
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
      eas: {
        projectId: "seu-project-id-aqui"
      }
    }
  }
};
```

## 📋 Comandos Úteis

### Desenvolvimento
```bash
# Iniciar com cache limpo
expo start --clear

# Iniciar no modo tunnel (para dispositivos em redes diferentes)
expo start --tunnel

# Iniciar apenas para Android
expo start --android

# Iniciar apenas para iOS
expo start --ios
```

### Build e Deploy
```bash
# Ver status dos builds
eas build:list

# Cancelar build
eas build:cancel [build-id]

# Submit para stores
eas submit --platform android
eas submit --platform ios

# Ver informações do projeto
eas project:info
```

### Debugging
```bash
# Logs detalhados
expo start --verbose

# Resetar cache do Metro
expo start --reset-cache

# Verificar configuração
expo doctor
```

## 🔍 Troubleshooting

### Problemas Comuns

**1. Erro de variáveis de ambiente:**
- Verifique se o arquivo `.env` existe e está configurado
- Reinicie o servidor após alterar variáveis

**2. Erro de build:**
```bash
# Limpar cache
expo install --fix
npm install
expo start --clear
```

**3. Problemas com dependências nativas:**
- Use EAS Build em vez do build clássico
- Verifique compatibilidade das dependências

**4. Erro de certificados (iOS):**
- Configure certificados no Apple Developer Portal
- Use `eas credentials` para gerenciar

## 📱 Tipos de Build Recomendados

### Para Desenvolvimento
- **Expo Go**: Desenvolvimento rápido
- **Development Build**: Quando usar bibliotecas nativas

### Para Testes
- **Preview Build**: APK para testes internos
- **TestFlight/Internal Testing**: Distribuição para testadores

### Para Produção
- **Production Build**: AAB/IPA para stores
- **Web Build**: Deploy em servidores web

## 🚀 Deploy Automático

### GitHub Actions (Exemplo)
```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx eas-cli build --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

**💡 Dica:** Para builds mais rápidos e confiáveis, use sempre o **EAS Build** em vez do build clássico do Expo.

**📚 Documentação oficial:** https://docs.expo.dev/build/introduction/