/**
 * 운동 기록 연결 화면(HA-3)의 표시 단계.
 *
 * 권한 요청 전 설명 단계(`Intro`)를 별도로 두는 이유: HealthKit은 무엇을 왜 읽는지
 * 앱 UI에서 먼저 드러내야 한다(App Store 심사 2.5.1, HA-2). 이미 권한 요청을
 * 마친 사용자는 이 단계를 건너뛰고 바로 후보 조회로 들어간다.
 */
enum BagActivityPhase {
  /** 기간·연결 상태를 읽는 중 */
  Preparing = 'preparing',
  /**
   * 이미 연결된 기록이 있어 상세를 보여주는 단계(HA-4).
   * 진입 시 후보 선택 대신 이 단계로 열고, 재선택은 별도 액션으로 후보 조회에 들어간다.
   */
  Detail = 'detail',
  /** 권한 요청 전 설명 화면 */
  Intro = 'intro',
  /** 건강 허브 후보 조회 중 */
  Loading = 'loading',
  /** 후보 1건 이상 */
  Ready = 'ready',
  /** 후보 0건 — 기록이 없거나 접근이 허용되지 않음(HA-2, 둘을 구분할 수 없다) */
  Empty = 'empty',
  /** 조회 실패 */
  Error = 'error',
}

export default BagActivityPhase;
