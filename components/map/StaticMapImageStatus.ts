// 정적 지도 썸네일(MAP-3) 생성 상태 — `useStaticMapImage`가 돌려준다.
enum StaticMapImageStatus {
  // 요청 없음(여행지 없음·좌표 이상·폭 측정 전). 밴드를 그리지 않는다.
  Idle = 'idle',
  // 캐시 확인·생성 중. 밴드 자리를 스켈레톤 면으로 잡아 둔다.
  Loading = 'loading',
  // `file://` URI 준비됨.
  Ready = 'ready',
  // 생성 실패·오프라인·웹. 밴드 없는 폴백.
  Failed = 'failed',
}

export default StaticMapImageStatus;
