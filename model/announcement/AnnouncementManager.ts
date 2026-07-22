import { makeAutoObservable } from 'mobx';
import { doc, onSnapshot } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import LocalStorageManager from '../storage/LocalStorageManager';

// config/announcement 문서 스키마 (DataModel DM-23).
// 콘솔에서 수동으로만 쓰고 클라이언트는 읽기만 한다.
type AnnouncementData = {
  id: string;
  active: boolean;
  message: string;
  link?: string;
  startAt?: string;
  endAt?: string;
};

// 닫은 공지 id 목록을 기기 로컬에 보관하는 키. 닫음 상태는 id 단위로 판정한다(AN-4).
const DISMISSED_IDS_STORAGE_KEY = 'announcement.dismissed.ids';

class AnnouncementManager {
  public static new(firebase: Firebase) {
    return new AnnouncementManager(firebase);
  }

  private announcement: AnnouncementData | null = null;
  private dismissedIds: string[] = [];
  private unsubscribe: (() => void) | null = null;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  // 닫음 목록을 먼저 로드한 뒤 실시간 구독을 시작한다(로드 전에 뜨면 이미 닫은 공지가 잠깐 보일 수 있어서).
  public async initialize() {
    await this.loadDismissedIds();

    this.subscribe();
  }

  private subscribe() {
    // 이미 구독 중이면 중복 등록하지 않는다.
    if (this.unsubscribe) {
      return;
    }

    try {
      const ref = doc(this.firebase.getStore(), 'config', 'announcement');

      this.unsubscribe = onSnapshot(
        ref,
        snapshot => {
          if (!snapshot.exists()) {
            this.setAnnouncement(null);

            return;
          }

          this.setAnnouncement(this.parse(snapshot.data()));
        },
        // 구독 실패(권한/네트워크)는 fail-open으로 통과한다 — 배너 없이 앱은 정상 동작한다(AN-2, §5).
        error => {
          console.warn('공지 배너 구독 실패', error);

          this.setAnnouncement(null);
        }
      );
    } catch (error) {
      // getStore 미초기화 등 예외도 fail-open으로 통과한다.
      console.warn('공지 배너 구독 시작 실패', error);

      this.setAnnouncement(null);
    }
  }

  // 문서 원본을 앱에서 쓰는 형태로 정규화한다. id가 없으면 식별 불가라 null.
  private parse(data: Record<string, unknown>): AnnouncementData | null {
    const id = typeof data.id === 'string' ? data.id : '';

    if (!id) {
      return null;
    }

    const message = typeof data.message === 'string' ? data.message : '';
    const result: AnnouncementData = {
      id,
      active: data.active === true,
      message,
    };

    // exactOptionalPropertyTypes를 켠 tsconfig라 옵셔널 필드는 값이 있을 때만 넣는다.
    if (typeof data.link === 'string') {
      result.link = data.link;
    }

    if (typeof data.startAt === 'string') {
      result.startAt = data.startAt;
    }

    if (typeof data.endAt === 'string') {
      result.endAt = data.endAt;
    }

    return result;
  }

  // 배너 표시 판정: active + message 존재 + 노출 기간 내 + 닫지 않은 id (AN-2).
  public shouldShow(): boolean {
    const announcement = this.announcement;

    if (!announcement) {
      return false;
    }

    if (!announcement.active) {
      return false;
    }

    if (!announcement.message) {
      return false;
    }

    if (this.dismissedIds.includes(announcement.id)) {
      return false;
    }

    if (!this.isWithinPeriod(announcement)) {
      return false;
    }

    return true;
  }

  private isWithinPeriod(announcement: AnnouncementData): boolean {
    const now = Date.now();

    if (announcement.startAt) {
      const start = new Date(announcement.startAt).getTime();

      // 파싱 가능하고 아직 시작 전이면 노출 안 함. 파싱 불가(NaN)면 시작 제한 없음으로 본다.
      if (Number.isFinite(start) && now < start) {
        return false;
      }
    }

    if (announcement.endAt) {
      const end = new Date(announcement.endAt).getTime();

      if (Number.isFinite(end) && now > end) {
        return false;
      }
    }

    return true;
  }

  public getMessage(): string {
    return this.announcement?.message ?? '';
  }

  public getLink(): string | null {
    return this.announcement?.link ?? null;
  }

  // 현재 공지를 닫는다. id 단위로 기억해 같은 id는 다시 뜨지 않는다(AN-4).
  public async dismiss() {
    const announcement = this.announcement;

    if (!announcement) {
      return;
    }

    if (this.dismissedIds.includes(announcement.id)) {
      return;
    }

    const next = [...this.dismissedIds, announcement.id];

    this.setDismissedIds(next);

    await LocalStorageManager.set(DISMISSED_IDS_STORAGE_KEY, next);
  }

  private async loadDismissedIds() {
    const stored = await LocalStorageManager.get<string[]>(
      DISMISSED_IDS_STORAGE_KEY
    );

    if (Array.isArray(stored)) {
      this.setDismissedIds(stored);
    }
  }

  private setAnnouncement(value: AnnouncementData | null) {
    this.announcement = value;
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

export default AnnouncementManager;
