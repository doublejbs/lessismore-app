import app from '@/model/app/App';
import { saveBagDestination } from '@/model/bag-destination/BagDestinationSave';
import BagWeather from '@/model/bag/BagWeather';
import BagStore from '@/model/store/BagStore';
import { BagScheduleChange, BagScheduleWriter } from './GroupBagLinkTypes';

/**
 * 배낭 상세 밖(그룹 상세)에서 일정 맞춤을 쓴다 (GRP-5).
 * 새 쓰기 경로를 만들지 않는다 — 기간은 배낭 정보 수정과 같은 `BagStore.updateDates`,
 * 여행지는 박지 상세가 쓰는 `saveBagDestination`(DST-6)을 그대로 탄다.
 */
class StoredBagScheduleWriter implements BagScheduleWriter {
  public static of(bagId: string) {
    return new StoredBagScheduleWriter(bagId, app.getBagStore()!);
  }

  private constructor(
    private readonly bagId: string,
    private readonly bagStore: BagStore
  ) {}

  public async applySchedule(change: BagScheduleChange): Promise<void> {
    if (change.dates) {
      await this.bagStore.updateDates(
        this.bagId,
        change.dates.startDate,
        change.dates.endDate
      );
    }

    // 여행지를 바꾸면 저장 경로가 **바뀐 기간**으로 새 날씨를 조회한다(기간을 먼저 쓴 이유).
    if (change.location) {
      await saveBagDestination(this.bagStore, this.bagId, change.location);

      return;
    }

    // 기간만 바뀌면 배낭 상세의 기간 수정과 같게 새 기간으로 날씨 신선도를 다시 판단한다
    // (`BagDetail.updateDates` → `BagWeather.updateTripDates`). 날씨는 부가 정보라 실패해도 올리지 않는다.
    try {
      await BagWeather.of(this.bagId, this.bagStore).load();
    } catch (error) {
      console.warn('[StoredBagScheduleWriter] weather refresh failed', error); // l10n-ignore: 개발자 로그
    }
  }
}

export default StoredBagScheduleWriter;
