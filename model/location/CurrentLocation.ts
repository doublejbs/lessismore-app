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
// 그래서 이 모듈은 두 가지 수단을 제공한다.
// - `startFirstPositionWatch`: 구독을 **잠깐** 열어 첫 전달만 받는다. 구독은 위치 요청을
//   등록해 provider를 켜므로(①의 뒤집기) 첫 전달이 일회성 요청보다 빨리 온다. 상시 구독이
//   없는 여행지 선택기의 현재 위치 버튼이 쓴다(DST-3).
// - `getCurrentPositionWithinTimeout`: 일회성 요청에 상한을 건다. 이미 상시 구독이 있어
//   구독을 새로 열 이유가 없는 지도 탭의 폴백 사슬 마지막 단계다(CS-1 ①구독값 → ②캐시 → ③새 fix).
// 어느 쪽이든 상한을 넘기면 `null`을 돌려주고, 다음 수단(캐시·폴백 좌표·실패 안내)은 호출부가 정한다.

// 새 위치(구독 첫 전달 또는 일회성 fix)를 기다릴 최대 시간.
// 이 값을 넘기면 호출부가 캐시·실패 안내로 넘어간다.
const CURRENT_POSITION_TIMEOUT_MS = 5000;

// 위치 조회가 끝내 실패했을 때의 공통 안내 문구(CS-1 / DST-3).
// 조용히 끝내면 사용자는 버튼이 죽은 것으로 인식하므로 반드시 노출한다.
// 노출 수단은 화면마다 다르다 — 지도 탭은 토스트, 풀스크린 모달인 여행지 선택기는
// 전역 토스트가 모달 뒤에 가려져 Alert를 쓴다(DST-3).
export const CURRENT_LOCATION_FAILED_MESSAGE =
  '현재 위치를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.';

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

// 새 위치 fix를 요청하되 상한을 넘기면 null을 돌려준다(CS-1).
// **폴백 사슬의 마지막 수단**이다 — 스로틀 상황에서는 새 fix가 상한 안에 오지 않아 상한만큼
// 통째로 대기하게 되므로, 호출부는 이미 구독 중인 값과 캐시를 먼저 확인한 뒤 이 함수를 부른다.
// (상시 구독이 없는 여행지 선택기는 이 함수 대신 startFirstPositionWatch를 쓴다, DST-3.)
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

// 탭 시점에 연 짧은 구독의 핸들(DST-3 현재 위치 버튼).
export interface FirstPositionWatch {
  // 첫 전달을 받으면 그 위치를, 상한 초과·취소면 null을 돌려준다. 여러 번 불러도 같은 결과다.
  waitForFirstPosition: () => Promise<Location.LocationObject | null>;
  // 호출부가 어떤 이유로든(화면 닫힘·언마운트) 결과를 버릴 때 구독을 닫는다. 중복 호출은 무시된다.
  cancel: () => void;
}

// 위치 구독을 열어 **첫 전달 하나만** 받고 곧바로 닫는다(DST-3).
//
// 왜 일회성 요청(getCurrentPositionAsync)이 아니라 구독인가 — 위 ①이 근거다.
// 구독이 없는 동안 fused provider는 `ProviderRequest[OFF]`라 OS가 위치를 계산조차 하지 않고,
// 그 상태의 일회성 요청은 provider 기동 + 정지 스로틀이 겹쳐 상한을 통째로 소진한다.
// 구독은 위치 요청을 등록해 provider를 켜므로 첫 전달이 빨리 온다(지도 탭이 구독 기반이라
// 파란 점은 즉시 갱신되는데 버튼만 죽어 보였던 이유). **일회성 요청으로 되돌리면 재발한다.**
//
// 상시 구독은 하지 않는다 — 버튼을 누른 몇 초 동안만 열고 첫 전달 즉시 닫는다.
// 첫 전달·상한 초과·취소·예외 중 무엇이 먼저 와도 구독 해제는 정확히 한 번만 일어난다.
export const startFirstPositionWatch = (): FirstPositionWatch => {
  let settled = false;
  let subscription: Location.LocationSubscription | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolveResult: ((value: Location.LocationObject | null) => void) | null =
    null;
  let rejectResult: ((reason: unknown) => void) | null = null;

  const result = new Promise<Location.LocationObject | null>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    }
  );

  // 참조를 먼저 비우고 remove를 부른다 — 어느 경로로 들어와도 두 번 해제되지 않는다.
  const removeSubscription = () => {
    const started = subscription;

    subscription = null;
    started?.remove();
  };

  // 가장 먼저 도착한 결과 하나만 채택한다. 이미 끝났으면 false를 돌려 무시하게 한다.
  const closeWatch = (): boolean => {
    if (settled) {
      return false;
    }

    settled = true;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    removeSubscription();

    return true;
  };

  const finishWith = (position: Location.LocationObject | null) => {
    if (closeWatch()) {
      resolveResult?.(position);
    }
  };

  const failWith = (error: unknown) => {
    if (closeWatch()) {
      rejectResult?.(error);
    }
  };

  const startWatch = async () => {
    // 상한 안에 첫 전달이 없으면 구독을 닫고 null을 돌려 호출부가 캐시로 폴백하게 한다.
    timeoutId = setTimeout(() => {
      finishWith(null);
    }, CURRENT_POSITION_TIMEOUT_MS);

    try {
      const started = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced },
        position => {
          finishWith(position);
        }
      );

      // 이 Promise는 첫 전달·상한·취소보다 늦게 resolve될 수 있다. 그 사이 이미 끝났다면
      // 여기가 유일한 해제 지점이다(closeWatch는 그때 subscription이 null이라 아무것도 못 닫는다).
      if (settled) {
        started.remove();

        return;
      }

      subscription = started;
    } catch (error) {
      failWith(error);
    }
  };

  void startWatch();

  return {
    waitForFirstPosition: () => result,
    cancel: () => {
      finishWith(null);
    },
  };
};
