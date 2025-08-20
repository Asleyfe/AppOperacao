const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver problema do BackHandler com react-native-screens
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Adicionar polyfills para resolver problemas de compatibilidade
config.resolver.alias = {
  ...config.resolver.alias,
};

// Configurar transformações para resolver problemas com BackHandler
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
  },
};

// Adicionar polyfill específico para BackHandler
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];

module.exports = config;