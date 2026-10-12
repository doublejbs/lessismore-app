// OF-1·OF-2·§6: 오프라인 저장이 실패한 이유. 토스트 문구가 갈린다.
enum OfflineSaveErrorType {
  // 저장된 여행이 이미 10개(OF-1).
  LimitExceeded = 'limitExceeded',
  // 기기 저장 공간 부족(§6).
  DiskFull = 'diskFull',
  // 연결이 없다(OF-2 — 저장·갱신은 온라인에서만).
  Offline = 'offline',
  // 구독(체험 포함) 권한이 없다(OF-7).
  NotEntitled = 'notEntitled',
  // 배낭을 읽지 못했다(삭제됨·권한).
  NotFound = 'notFound',
  // 그 밖의 실패(네트워크 중단·파일 쓰기 실패).
  Unknown = 'unknown',
}

export default OfflineSaveErrorType;
