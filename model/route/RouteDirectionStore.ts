import { makeAutoObservable, runInAction } from 'mobx';
import LocalStorageManager from '@/model/storage/LocalStorageManager';

/**
 * 기기에 저장하는 키. 값은 뒤집어 보는 코스의 **방향 키** 배열이다(`RouteDisplay.getDirectionKey`).
 * 방향 키는 코스 문서의 `storagePath`라 그룹 코스(`groups/{groupId}/routes/{routeId}.gpx`)와
 * 배낭 코스(`bags/{bagId}/routes/{routeId}.gpx`)가 한 목록에 섞여도 겹치지 않는다.
 */
const STORAGE_KEY = 'route-direction-reversed';

/**
 * 기억해 둘 코스 수의 상한. 지워진 코스의 키는 알 길이 없어 남는다 — 오래된 것부터 버린다.
 * 한 사람이 뒤집어 두는 코스가 이만큼 쌓일 일은 드물다(그룹·배낭 모두 5개 상한).
 */
const MAX_STORED_KEYS = 200;

/**
 * 코스 방향(뒤집기) 기억 (GRP-8, BD-11).
 *
 * **보는 사람의 화면 설정**이라 서버에 쓰지 않는다 — 코스 문서·Storage 원본은 그대로고,
 * 코스 문서 수정을 막아 둔 보안 규칙(`allow update: if false`)도 열지 않는다. 그룹 코스를 누가
 * 뒤집어도 다른 멤버의 화면은 바뀌지 않는다(2026-09-23 사용자 결정).
 *
 * MobX observable이라 코스 모델이 이 값을 읽는 순간 화면(observer)이 방향 변화를 따라간다.
 */
class RouteDirectionStore {
  // 배열 순서 = 뒤집은 순서(오래된 것이 앞). 상한을 넘으면 앞에서부터 버린다.
  private reversedKeys: string[] = [];

  public static new() {
    return new RouteDirectionStore();
  }

  private constructor() {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    const stored = await LocalStorageManager.get<unknown>(STORAGE_KEY);

    if (!Array.isArray(stored)) {
      return;
    }

    const keys = stored.filter(
      (key): key is string => typeof key === 'string' && key.length > 0
    );

    runInAction(() => {
      // 복원 전에 사용자가 이미 뒤집은 코스가 있으면 그 값을 살린다.
      const merged = [
        ...keys.filter(key => !this.reversedKeys.includes(key)),
        ...this.reversedKeys,
      ];

      this.reversedKeys = merged.slice(-MAX_STORED_KEYS);
    });
  }

  public isReversed(key: string): boolean {
    return !!key && this.reversedKeys.includes(key);
  }

  public toggle(key: string): void {
    if (!key) {
      return;
    }

    this.reversedKeys = this.isReversed(key)
      ? this.reversedKeys.filter(item => item !== key)
      : [...this.reversedKeys, key].slice(-MAX_STORED_KEYS);

    void LocalStorageManager.set(STORAGE_KEY, this.reversedKeys);
  }
}

export default RouteDirectionStore;
