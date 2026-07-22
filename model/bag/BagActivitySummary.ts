import BagActivityPlatform from './BagActivityPlatform';

/**
 * 배낭에 연결된 운동 기록(DM-22 `bag.activity`).
 *
 * **건강 데이터 원본은 담지 않는다**(HA-5) — 기기 건강 허브의 운동을 가리키는
 * 참조(`workoutIds`)와 표시용 요약 스냅샷만 둔다. 심박·경로 좌표 같은 시계열은
 * 절대 서버로 올리지 않으며, 상세는 표시 시점에 기기에서 다시 읽는다.
 */
export interface BagActivitySummary {
  /** 건강 허브의 운동 식별자. 1박 2일이 날짜별로 나뉜 경우를 위해 복수(HA-3). */
  workoutIds: string[];
  platform: BagActivityPlatform;
  /** 총 이동 거리(m). 표시용 스냅샷. */
  distance: number;
  /** 총 소요 시간(초). */
  duration: number;
  /** 누적 상승고도(m). 소스에 없으면 생략. */
  elevationGain?: number;
  /** 소모 활동 에너지(kcal). 소스에 없으면 생략. */
  activeEnergy?: number;
  /** 연결 시각(ISO). */
  linkedAt: string;
}
