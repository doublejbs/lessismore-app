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
        //
        // 정규식(/node_modules/)이 아니라 함수를 쓰는 이유: SDK 57의 babel-transformer는
        // 캐시 키를 계산할 때 파일명 없이 설정을 로드하는데, 문자열/정규식 패턴이 있으면
        // Babel이 "Configuration contains string/RegExp pattern, but no filename was passed"
        // 로 던져 Metro transformer 생성 자체가 실패한다. 함수 술어는 그 검사를 타지 않는다.
        exclude: filename =>
          typeof filename === 'string' && filename.includes('node_modules'),
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
        ],
      },
    ],
  };
};
