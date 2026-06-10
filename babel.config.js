module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // hot-updater 0.21+ 부터 babel plugin 불필요 (Expo DOM 컴포넌트 사용 시에만 '@hot-updater/expo/babel-plugin' 필요)
      // Required for expo-router
      // 'expo-router/babel',
      // MobX 데코레이터 지원
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
    ],
  };
};
