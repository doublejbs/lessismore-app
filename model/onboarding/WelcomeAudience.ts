// 환영 화면을 본 사용자 구분 — `welcome_view`의 `audience` 파라미터(OB-9·OB-15).
enum WelcomeAudience {
  // 비로그인 첫 실행.
  Guest = 'guest',
  // 여행 0개 로그인 사용자.
  Member = 'member',
}

export default WelcomeAudience;
