module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // hot-updater 0.21+ 부터 babel plugin 불필요 (Expo DOM 컴포넌트 사용 시에만 '@hot-updater/expo/babel-plugin' 필요)
    overrides: [
      {
        // MobX 레거시 데코레이터 플러그인은 앱 코드에만 적용.
        // SDK 54부터 일부 expo 패키지가 TS 소스로 배포되어, 전역 적용 시
        // node_modules의 `declare` 클래스 필드가 preset의 TS 변환 전에
        // class-properties 플러그인에 걸려 번들링이 실패한다.
        exclude: /node_modules/,
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
        ],
      },
    ],
  };
};
