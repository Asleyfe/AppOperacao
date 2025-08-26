// Polyfill para BackHandler em ambiente web/expo
if (typeof global !== 'undefined' && !global.BackHandler) {
  global.BackHandler = {
    addEventListener: () => {
      // Mock implementation - retorna uma função de cleanup vazia
      return () => {};
    },
    removeEventListener: () => {
      // Mock implementation - não faz nada
      return true;
    },
    exitApp: () => {
      // Mock implementation - não faz nada em web
      return false;
    }
  };
}

// Também adicionar ao React Native se não existir
if (typeof require !== 'undefined') {
  try {
    const { BackHandler } = require('react-native');
    if (!BackHandler || !BackHandler.removeEventListener) {
      const RN = require('react-native');
      RN.BackHandler = {
        ...RN.BackHandler,
        addEventListener: RN.BackHandler?.addEventListener || (() => () => {}),
        removeEventListener: RN.BackHandler?.removeEventListener || (() => true),
        exitApp: RN.BackHandler?.exitApp || (() => false)
      };
    }
  } catch (error) {
    // Ignorar erros se react-native não estiver disponível
    console.warn('BackHandler polyfill: react-native não disponível');
  }
}

module.exports = {};