/**
 * 상태 화면 액션의 무게. **라임은 화면당 하나**라(HM-8) 본문이 주 액션을 들고 있는
 * 상태(빈 목록·로그인 유도)에서만 `Primary`를 쓰고, 그 외에는 연회색 알약이다.
 */
enum GroupStateActionVariant {
  Neutral = 'Neutral',
  Primary = 'Primary',
}

export default GroupStateActionVariant;
