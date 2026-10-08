// SR-11: 빈 상태 `직접 추가` 버튼 위계(HM-8 라임은 화면당 하나).
// - Primary: 빈 상태가 화면의 유일한 액션일 때(탐색 탭 검색·`/search` 모달) — 라임 면
// - Secondary: 화면에 이미 주 액션이 있을 때(창고 `안 쓴 장비`·배낭 편집 `완료`) — 흰 면 + 잉크 테두리
enum SearchEmptyButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
}

export default SearchEmptyButtonVariant;
