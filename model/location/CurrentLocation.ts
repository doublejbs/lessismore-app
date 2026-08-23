import * as Location from 'expo-location';

// 현재 위치 조회의 "무기한 대기 금지" 규칙을 담는 단일 지점(CampSite CS-1 / BagDestination DST-3).
//
// 안드로이드에서 새 위치가 늦게 오는 이유는 두 가지가 겹친 것이다.
// ① **아무도 구독하지 않으면 OS는 위치를 아예 계산하지 않는다.** `adb shell dumpsys location`을
//    보면 요청이 없는 동안 fused provider가 `ProviderRequest[OFF]`다(2026-07-29 실기기 확인).
//    그 상태에서 일회성 요청을 넣으면 OS가 그제야 provider를 깨우기 시작한다.
// ② FusedLocationProvider는 기기가 정지해 있으면 위치 전달을 억제한다
//    (logcat: `stationary throttling engaged` / `location delivery blocked - too close`).
// 그래서 옵션 없는 `Location.getCurrentPositionAsync({})`는 책상에 둔 폰에서 약 30초가 걸렸다
// (2026-07-29 Pixel 7 Pro 실기기 실측). 예외가 아니라 지연이라 `catch`에도 걸리지 않아,
// 화면이 조용히 멈춘 것처럼 보인다. iOS엔 이 스로틀이 없어 안드로이드에서만 재현된다.
//
// 상한은 "혹시 몰라서" 걸어둔 방어 코드가 아니라 위 증상의 직접적인 수정이다. 없애면 재발한다.
// 다만 상한만으로는 부족하다 — 스로틀이 걸린 상태에서는 새 fix가 상한 안에 오지 않아
// **매번 상한만큼 통째로 기다린 뒤에야** 다음 수단으로 넘어간다(2026-07-29 재보고).
//
// 그래서 두 지도 화면 모두 **화면이 살아 있는 동안 위치를 구독**한다 — 지도 탭은 파란 점을
// 위해(CS-1), 여행지 선택기는 선택기가 열려 있는 동안(DST-3). 구독은 위치 요청을 등록해
// provider를 켜므로(①의 뒤집기) 최신 좌표가 항상 준비돼 있고, 현재 위치 버튼은 그 값을
// 그대로 써서 대기 0으로 끝난다. **버튼을 일회성 요청으로 되돌리지 말 것 — 30초 지연이 재발한다.**
//
// 이 모듈의 `getCurrentPositionWithinTimeout`은 그 폴백 사슬의 **마지막 단계**다
// (①구독 값 → ②캐시 → ③상한 건 새 fix). 상한을 넘기면 `null`을 돌려주고,
// 다음 수단(폴백 좌표·실패 안내)은 호출부가 정한다.

// 새 위치 fix를 기다릴 최대 시간. 이 값을 넘기면 호출부가 폴백 좌표·실패 안내로 넘어간다.
const CURRENT_POSITION_TIMEOUT_MS = 5000;

// 위치 조회가 끝내 실패했을 때의 공통 안내 문구(CS-1 / DST-3).
// 조용히 끝내면 사용자는 버튼이 죽은 것으로 인식하므로 반드시 노출한다.
// 노출 수단은 화면마다 다르다 — 지도 탭은 토스트, 풀스크린 모달인 여행지 선택기는
// 전역 토스트가 모달 뒤에 가려져 Alert를 쓴다(DST-3).
// expo-location의 LocationOptions에는 timeout이 없어 Promise.race로 상한을 건다.
// 상한을 넘기면 null을 돌려 호출부가 다음 수단(폴백 좌표·실패 안내)으로 넘어가게 한다.
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
// **폴백 사슬의 마지막 수단**이다 — 스로틀 상황에서는 새 fix가 상한 안에 오지 않아 상한만큼
// 통째로 대기하게 되므로, 호출부는 이미 구독 중인 값과 캐시를 먼저 확인한 뒤 이 함수를 부른다.
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
