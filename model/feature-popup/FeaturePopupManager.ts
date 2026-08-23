import { makeAutoObservable } from 'mobx';
import { doc, onSnapshot } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import LocalStorageManager from '../storage/LocalStorageManager';

// config/featurePopup 문서의 아이템 스키마 (DataModel DM-24).
// title만 필수이고 나머지는 값이 있을 때만 채운다(최대 3개는 parse에서 자른다).
type FeaturePopupItemData = {
  imageUrl?: string;
  title: string;
  description?: string;
  link?: string;
};

// config/featurePopup 문서 스키마 (DataModel DM-24).
// 콘솔에서 수동으로만 쓰고 클라이언트는 읽기만 한다.
type FeaturePopupData = {
  id: string;
  active: boolean;
  title: string;
  subtitle?: string;
  items: FeaturePopupItemData[];
  buttonLabel?: string;
  buttonLink?: string;
  showSkip?: boolean;
  // 강제(차단) 모드(FP-7). parse에서 항상 boolean으로 확정한다.
  forced: boolean;
  startAt?: string;
  endAt?: string;
};

// 닫은 팝업 id 목록을 기기 로컬에 저장하는 키(FP-5).
const FEATURE_POPUP_DISMISSED_STORAGE_KEY = 'featurePopup.dismissed.ids';
// 렌더하는 아이템 최대 개수(FP-3).
const MAX_ITEMS = 3;
// 닫은 id 목록이 무한정 커지지 않도록 최근 것 우선 최대 개수.
const MAX_DISMISSED_IDS = 50;

class FeaturePopupManager {
  public static new(firebase: Firebase) {
    return new FeaturePopupManager(firebase);
  }

  private popup: FeaturePopupData | null = null;
  // '닫기'로 영구 숨긴 팝업 id 목록. 기기 로컬(AsyncStorage)에 저장한다(FP-5).
  private dismissedIds: string[] = [];
  private unsubscribe: (() => void) | null = null;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  // 닫음 목록을 먼저 로드한 뒤 실시간 구독을 시작한다(로드 전에 뜨면 이미 닫은 팝업이 잠깐 보일 수 있어서).
  public async initialize() {
    await this.loadDismissed();

    this.subscribe();
  }

  private subscribe() {
    // 이미 구독 중이면 중복 등록하지 않는다.
    if (this.unsubscribe) {
      return;
    }

    try {
      const ref = doc(this.firebase.getStore(), 'config', 'featurePopup');

      this.unsubscribe = onSnapshot(
        ref,
        snapshot => {
          if (!snapshot.exists()) {
            this.setPopup(null);

            return;
          }

          this.setPopup(this.parse(snapshot.data()));
        },
        // 구독 실패(권한/네트워크)는 fail-open으로 통과한다 — 팝업 없이 앱은 정상 동작한다(FP-2, §5).
        error => {
          console.warn('신기능 팝업 구독 실패', error); // l10n-ignore: 개발자 로그

          this.setPopup(null);
        }
      );
    } catch (error) {
      // getStore 미초기화 등 예외도 fail-open으로 통과한다.
      console.warn('신기능 팝업 구독 시작 실패', error); // l10n-ignore: 개발자 로그

      this.setPopup(null);
    }
  }

  // 문서 원본을 앱에서 쓰는 형태로 정규화한다. id가 없으면 식별 불가라 null.
  private parse(data: Record<string, unknown>): FeaturePopupData | null {
    const id = typeof data.id === 'string' ? data.id : '';

    if (!id) {
      return null;
    }

    const title = typeof data.title === 'string' ? data.title : '';
    const result: FeaturePopupData = {
      id,
      active: data.active === true,
      title,
      items: this.parseItems(data.items),
      // 강제 모드는 명시적 true일 때만(FP-7). 미지정·이상값은 일반 모드.
      forced: data.forced === true,
    };

    // exactOptionalPropertyTypes를 켠 tsconfig라 옵셔널 필드는 값이 있을 때만 넣는다.
    if (typeof data.subtitle === 'string') {
      result.subtitle = data.subtitle;
    }

    if (typeof data.buttonLabel === 'string') {
      result.buttonLabel = data.buttonLabel;
    }

    if (typeof data.buttonLink === 'string') {
      result.buttonLink = data.buttonLink;
    }

    if (typeof data.showSkip === 'boolean') {
      result.showSkip = data.showSkip;
    }

    if (typeof data.startAt === 'string') {
      result.startAt = data.startAt;
    }

    if (typeof data.endAt === 'string') {
      result.endAt = data.endAt;
    }

    return result;
  }

  // items 배열을 정규화한다 — title 없는 원소는 스킵하고, 앞에서 최대 3개만 유지한다(FP-3).
  private parseItems(value: unknown): FeaturePopupItemData[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const items: FeaturePopupItemData[] = [];

    for (const raw of value) {
      if (items.length >= MAX_ITEMS) {
        break;
      }

      if (typeof raw !== 'object' || raw === null) {
        continue;
      }

      const record = raw as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title : '';

      if (!title) {
        continue;
      }

      const item: FeaturePopupItemData = { title };

      if (typeof record.imageUrl === 'string') {
        item.imageUrl = record.imageUrl;
      }

      if (typeof record.description === 'string') {
        item.description = record.description;
      }

      if (typeof record.link === 'string') {
        item.link = record.link;
      }

      items.push(item);
    }

    return items;
  }

  // 팝업 표시 판정: active + title 존재 + 노출 기간 내 + 닫지 않은 id (FP-2/FP-5).
  // 강제 업데이트 게이트 조건(FP-6)은 View 레이어에서 처리한다(AnnouncementManager와 동일한 역할 분담).
  public shouldShow(): boolean {
    const popup = this.popup;

    if (!popup) {
      return false;
    }

    if (!popup.active) {
      return false;
    }

    if (!popup.title) {
      return false;
    }

    // 강제 모드는 이전에 닫은 id여도 표시한다 — 노출 스위치는 원격 문서뿐(FP-7).
    if (!popup.forced && this.isDismissed(popup.id)) {
      return false;
    }

    if (!this.isWithinPeriod(popup)) {
      return false;
    }

    return true;
  }

  private isWithinPeriod(popup: FeaturePopupData): boolean {
    const now = Date.now();

    if (popup.startAt) {
      const start = new Date(popup.startAt).getTime();

      // 파싱 가능하고 아직 시작 전이면 노출 안 함. 파싱 불가(NaN)면 시작 제한 없음으로 본다.
      if (Number.isFinite(start) && now < start) {
        return false;
      }
    }

    if (popup.endAt) {
      const end = new Date(popup.endAt).getTime();

      if (Number.isFinite(end) && now > end) {
        return false;
      }
    }

    return true;
  }

  // 이 id를 이미 닫았는지 판정한다(FP-5).
  public isDismissed(id: string): boolean {
    return this.dismissedIds.includes(id);
  }

  // '닫기' — 현재 팝업 id를 영구 닫음 목록에 넣고 기기 로컬에 저장한다(FP-5).
  public async dismiss() {
    const popup = this.popup;

    if (!popup) {
      return;
    }

    // 강제 모드는 닫음 저장 금지(FP-7) — forced 해제 후 같은 id가 일반 모드로 다시 떠야 하므로
    // 닫음 목록에 기록하지 않는다. 내리는 방법은 원격 문서 변경뿐이다.
    if (popup.forced) {
      return;
    }

    if (this.dismissedIds.includes(popup.id)) {
      return;
    }

    // 최근 것 우선으로 앞에 넣고, 목록이 너무 커지지 않게 최대 개수로 자른다.
    const next = [popup.id, ...this.dismissedIds].slice(0, MAX_DISMISSED_IDS);

    this.setDismissedIds(next);

    await LocalStorageManager.set(FEATURE_POPUP_DISMISSED_STORAGE_KEY, next);
  }

  private async loadDismissed() {
    const stored = await LocalStorageManager.get<string[]>(
      FEATURE_POPUP_DISMISSED_STORAGE_KEY
    );

    if (Array.isArray(stored)) {
      const valid = stored.filter(id => typeof id === 'string');

      this.setDismissedIds(valid);
    }
  }

  public getId(): string | null {
    return this.popup?.id ?? null;
  }

  public getTitle(): string {
    return this.popup?.title ?? '';
  }

  public getSubtitle(): string | null {
    return this.popup?.subtitle ?? null;
  }

  public getItems(): FeaturePopupItemData[] {
    return this.popup?.items ?? [];
  }

  public getButtonLabel(): string {
    const label = this.popup?.buttonLabel ?? '';

    return label || '';
  }

  public getButtonLink(): string | null {
    return this.popup?.buttonLink ?? null;
  }

  // 건너뛰기 노출 여부(FP-5). showSkip이 명시적으로 false일 때만 숨긴다(기본 노출).
  public isSkippable(): boolean {
    return this.popup?.showSkip !== false;
  }

  // 강제(차단) 모드 여부(FP-7).
  public isForced(): boolean {
    return this.popup?.forced ?? false;
  }

  private setPopup(value: FeaturePopupData | null) {
    this.popup = value;
  }

  private setDismissedIds(value: string[]) {
    this.dismissedIds = value;
  }

  // 구독 해제 — 앱 종료·재초기화 시 리스너 누수를 막는다.
  public dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export default FeaturePopupManager;
