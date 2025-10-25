module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'hot-updater/babel-plugin',
      // Required for expo-router
      // 'expo-router/babel',
      // MobX 데코레이터 지원
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
    ],
  };
};
