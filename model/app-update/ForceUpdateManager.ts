import { makeAutoObservable } from 'mobx';
import { doc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import Firebase from '../firebase/Firebase';

// config/app 문서 스키마 (DataModel DM-13). 플랫폼별 최소 지원 버전.
type AppConfigData = {
  iosMinVersion?: string;
  androidMinVersion?: string;
};

const VERSION_SEGMENT_COUNT = 3;

class ForceUpdateManager {
  public static new(firebase: Firebase) {
    return new ForceUpdateManager(firebase);
  }

  private needsUpdate = false;
  private checked = false;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  // 앱 시작 시 1회만 조회한다(실시간 구독 아님, APP-7). 어떤 실패도 조용히 통과(fail-open).
  public async check() {
    if (this.checked) {
      return;
    }

    this.checked = true;

    // 웹은 스토어 개념이 없어 no-op.
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const currentVersion = this.getCurrentVersion();

      if (!currentVersion) {
        return;
      }

      const ref = doc(this.firebase.getStore(), 'config', 'app');
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data() as AppConfigData;
      const minVersion =
        Platform.OS === 'ios' ? data.iosMinVersion : data.androidMinVersion;

      if (typeof minVersion !== 'string' || !minVersion) {
        return;
      }

      if (this.isLower(currentVersion, minVersion)) {
        this.setNeedsUpdate(true);
      }
    } catch (error) {
      // 조회 실패·파싱 불가 등은 통과한다 — 정상 유저를 절대 막지 않는다(APP-7 fail-open).
      console.warn('강제 업데이트 버전 확인 실패', error);
    }
  }

  // HotUpdater.getAppVersion()으로 실제 설치 바이너리 버전을 읽는다.
  // Constants.expoConfig.version은 OTA 번들에 박힌 값이라 쓰지 않는다(APP-7).
  private getCurrentVersion(): string | null {
    try {
      // 네이티브에서만 동적 로드한다(웹 번들에 포함되면 빌드가 깨진다 — _layout 패턴과 동일).
      const { HotUpdater } = require('@hot-updater/react-native');
      const version = HotUpdater.getAppVersion();

      return typeof version === 'string' && version ? version : null;
    } catch {
      return null;
    }
  }

  // major.minor.patch 숫자 비교. current < min 이면 true.
  private isLower(current: string, min: string): boolean {
    const currentParts = this.parseVersion(current);
    const minParts = this.parseVersion(min);

    // 어느 쪽이든 파싱 불가면 판정하지 않는다(fail-open).
    if (!currentParts || !minParts) {
      return false;
    }

    for (let i = 0; i < VERSION_SEGMENT_COUNT; i += 1) {
      if (currentParts[i] < minParts[i]) {
        return true;
      }

      if (currentParts[i] > minParts[i]) {
        return false;
      }
    }

    return false;
  }

  private parseVersion(version: string): number[] | null {
    const segments = version.split('.');

    if (segments.length < VERSION_SEGMENT_COUNT) {
      return null;
    }

    const parts: number[] = [];

    for (let i = 0; i < VERSION_SEGMENT_COUNT; i += 1) {
      const value = Number.parseInt(segments[i], 10);

      if (!Number.isFinite(value)) {
        return null;
      }

      parts.push(value);
    }

    return parts;
  }

  private setNeedsUpdate(value: boolean) {
    this.needsUpdate = value;
  }

  public getNeedsUpdate(): boolean {
    return this.needsUpdate;
  }
}

export default ForceUpdateManager;
