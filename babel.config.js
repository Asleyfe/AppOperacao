module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Removed 'expo-router/babel' as it's deprecated and causing BackHandler issues
    ],
  };
};