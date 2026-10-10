import { makeAutoObservable } from 'mobx';
import { Platform } from 'react-native';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import CommunityWrite from '@/model/community-write/CommunityWrite';
import TripRecordDispatcher from './TripRecordDispatcher';
import TripRecordEntrySource from './TripRecordEntrySource';
import TripRecordStatus from './TripRecordStatus';
import { isTripEnded } from './TripRecordEligibility';

export interface TripRecordSubmitResult {
  postId: string;
  // 게시 직전 확인에서 이미 기록이 있었다(두 기기 동시 작성) — 새 글을 만들지 않았다.
  existing: boolean;
}

/**
 * 여행 기록 시트의 도메인 모델(CM-16).
 *
 * 글쓰기 파이프라인(검증·사진 업로드·게시·실패 정리)은 `CommunityWrite`를 그대로 쓴다 —
 * 다른 점은 입력이 사진·한 줄·선택 본문뿐이고, 배낭 스냅샷과 `isTripRecord`·`recordBagId`가
 * 자동으로 붙는다는 것이다.
 */
class TripRecord {
  public static from(
    bagId: string,
    entrySource: TripRecordEntrySource,
    dispatcher: TripRecordDispatcher = TripRecordDispatcher.new()
  ): TripRecord {
    return new TripRecord(
      bagId,
      entrySource,
      dispatcher,
      CommunityWrite.create()
    );
  }

  private status = TripRecordStatus.Loading;
  private bag: BagItem | null = null;
  private existingPostId: string | null = null;
  private bodyExpanded = false;
  private checking = false;
  private submitted = false;

  private constructor(
    private readonly bagId: string,
    private readonly entrySource: TripRecordEntrySource,
    private readonly dispatcher: TripRecordDispatcher,
    private readonly write: CommunityWrite
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    // 웹은 사진 선택이 없어 시트를 열지 않는다(CM-16 웹). 배낭은 로그인 전용이다.
    if (Platform.OS === 'web' || !app.getFirebase().isLoggedIn()) {
      this.setStatus(TripRecordStatus.Unavailable);

      return;
    }

    try {
      const [owned, existingPostId] = await Promise.all([
        this.dispatcher.getOwnedBag(this.bagId),
        this.dispatcher.findMyRecordId(this.bagId),
      ]);

      if (!owned) {
        this.setStatus(TripRecordStatus.Unavailable);

        return;
      }

      this.setBag(owned.bag);

      if (existingPostId) {
        this.setExistingPostId(existingPostId);
        this.setStatus(TripRecordStatus.Existing);

        return;
      }

      if (!isTripEnded(owned.bag.getTripEnd())) {
        this.setStatus(TripRecordStatus.NotEnded);

        return;
      }

      this.write.attachTripRecord(owned.bag, owned.gears);
      this.setStatus(TripRecordStatus.Ready);

      // `source`는 스펙 값(notification|bag_detail|home)만 보낸다 — 진입처를 모르면 보내지 않는다.
      if (this.entrySource !== TripRecordEntrySource.Direct) {
        app.getAnalyticsManager()?.logClick('trip_record_open', {
          source: this.entrySource,
        });
      }
    } catch (error) {
      console.error('여행 기록 시트 초기화 실패:', error); // l10n-ignore: 개발자 로그
      this.setStatus(TripRecordStatus.Unavailable);
    }
  }

  public getStatus() {
    return this.status;
  }

  public getBagId() {
    return this.bagId;
  }

  public getEntrySource() {
    return this.entrySource;
  }

  public getExistingPostId() {
    return this.existingPostId;
  }

  public getWrite() {
    return this.write;
  }

  // 배낭 요약 한 줄(읽기 전용): 이름 · 날짜 · 여행지 · 총무게.
  public getBagSummary(): string {
    const bag = this.bag;

    if (!bag) {
      return '';
    }

    return [
      bag.getName(),
      bag.getDisplayDate(),
      bag.getLocationName(),
      `${bag.getWeight()}kg`,
    ]
      .filter((part): part is string => Boolean(part))
      .join(app.getL10n().t('common.metaSeparator'));
  }

  public hasPhoto(): boolean {
    return this.write.getImageSession().images.length > 0;
  }

  public isBusy(): boolean {
    return this.checking || this.write.getIsSubmitting();
  }

  public canSubmit(): boolean {
    return (
      this.status === TripRecordStatus.Ready &&
      this.hasPhoto() &&
      !this.isBusy()
    );
  }

  public isBodyExpanded() {
    return this.bodyExpanded;
  }

  public expandBody() {
    this.setBodyExpanded(true);
  }

  public isSubmitted() {
    return this.submitted;
  }

  /**
   * 게시한다. 직전에 내 기록을 한 번 더 확인해 있으면 새로 만들지 않고 그 글을 돌려준다
   * (두 기기 동시 작성 방어, CM-16). 검증·업로드 실패는 `CommunityWrite`가 던진 그대로 올린다.
   */
  public async submit(): Promise<TripRecordSubmitResult | null> {
    if (!this.canSubmit()) {
      return null;
    }

    this.setChecking(true);

    let existingPostId: string | null = null;

    try {
      existingPostId = await this.dispatcher.findMyRecordId(this.bagId);
    } catch (error) {
      // 확인 실패로 기록을 막지 않는다 — 진입 시 한 번 확인했다.
      console.error('여행 기록 중복 확인 실패:', error); // l10n-ignore: 개발자 로그
    } finally {
      this.setChecking(false);
    }

    if (existingPostId) {
      this.setExistingPostId(existingPostId);
      this.setSubmitted(true);

      return { postId: existingPostId, existing: true };
    }

    const postId = await this.write.submit();

    if (!postId) {
      return null;
    }

    this.setSubmitted(true);
    app.getAnalyticsManager()?.logClick('trip_record_submit', {
      photo_count: this.write.getImageSession().getUploadedInOrder().length,
      has_body: this.write.getBody().trim().length > 0,
    });

    return { postId, existing: false };
  }

  // 게시하지 않고 닫을 때 업로드된 사진을 정리한다(CM-6).
  // 게시 중에는 정리하지 않는다 — 올리는 중인 사진을 지우면 게시가 깨진다.
  public async discard(): Promise<void> {
    if (
      this.isBusy() ||
      this.submitted ||
      this.status !== TripRecordStatus.Ready
    ) {
      return;
    }

    await this.write.cleanupForDiscard(app.getFirebase().getUserId());
  }

  private setStatus(value: TripRecordStatus) {
    this.status = value;
  }

  private setBag(value: BagItem | null) {
    this.bag = value;
  }

  private setExistingPostId(value: string | null) {
    this.existingPostId = value;
  }

  private setBodyExpanded(value: boolean) {
    this.bodyExpanded = value;
  }

  private setChecking(value: boolean) {
    this.checking = value;
  }

  private setSubmitted(value: boolean) {
    this.submitted = value;
  }
}

export default TripRecord;
