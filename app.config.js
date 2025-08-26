// app.config.js
require('dotenv/config');

module.exports = {
  expo: {
    name: 'GDES',
    slug: 'gdes',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    // Configuração de rota inicial
    initialRouteName: 'login',
    plugins: [
      'expo-font',
      'expo-router',
      'expo-web-browser'
    ],
    splash: {
      image: './assets/images/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.rodrigoashley.gdes",
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff'
      }
    },
    web: {
      favicon: './assets/images/favicon.png'
    },
    extra: {
      // Adicione suas variáveis de ambiente aqui
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
      eas: {
        projectId: "da594944-0fda-4611-83d5-723514082c3a"
      }
    },
  },
};