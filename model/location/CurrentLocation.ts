import * as Location from 'expo-location';

// 현재 위치 조회의 "무기한 대기 금지" 규칙을 담는 단일 지점(CampSite CS-1 / BagDestination DST-3).
//
// 왜 상한이 필요한가:
// 안드로이드 FusedLocationProvider는 기기가 정지해 있으면 위치 전달을 억제한다
// (logcat: `stationary throttling engaged` / `location delivery blocked - too close`).
// 그래서 옵션 없는 `Location.getCurrentPositionAsync({})`는 새 fix가 올 때까지 기다리며
// 책상에 둔 폰에서 약 30초가 걸렸다(2026-07-29 Pixel 7 Pro 실기기 실측).
// 예외가 아니라 지연이라 `catch`에도 걸리지 않아, 화면이 조용히 멈춘 것처럼 보인다
// (지도 탭은 현재 위치 버튼이 죽은 것처럼, 여행지 선택기는 지도가 30초 뒤에 뜨는 증상).
// iOS엔 이 스로틀이 없어 안드로이드에서만 재현된다.
//
// 즉, 상한은 "혹시 몰라서" 걸어둔 방어 코드가 아니라 위 증상의 직접적인 수정이다. 없애면 재발한다.

// 새 위치 fix를 기다릴 최대 시간. 이 값을 넘기면 호출부가 캐시·폴백·안내로 넘어간다.
const CURRENT_POSITION_TIMEOUT_MS = 5000;

// 위치 조회가 끝내 실패했을 때의 공통 안내 문구(CS-1 / DST-3).
// 조용히 끝내면 사용자는 버튼이 죽은 것으로 인식하므로 반드시 노출한다.
// 노출 수단은 화면마다 다르다 — 지도 탭은 토스트, 풀스크린 모달인 여행지 선택기는
// 전역 토스트가 모달 뒤에 가려져 Alert를 쓴다(DST-3).
export const CURRENT_LOCATION_FAILED_MESSAGE =
  '현재 위치를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.';

// expo-location의 LocationOptions에는 timeout이 없어 Promise.race로 상한을 건다.
// 상한을 넘기면 null을 돌려 호출부가 다음 수단(캐시·폴백·안내)으로 넘어가게 한다.
const raceWithTimeout = async <T>(
  target: Promise<T>,
  timeoutMs: number
): Promise<T | null> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeout = new Promise<null>(resolve => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([target, timeout]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

// 새 위치 fix를 요청하되 상한을 넘기면 null을 돌려준다(CS-1 / DST-3).
// 정확도를 Balanced로 낮춰 fix가 더 빨리 잡히게 한다.
// 조회 자체가 실패하면 예외는 그대로 전파한다 — 로그·안내 방식은 호출부가 정한다.
export const getCurrentPositionWithinTimeout =
  async (): Promise<Location.LocationObject | null> => {
    return raceWithTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      CURRENT_POSITION_TIMEOUT_MS
    );
  };
