import { Dayjs } from 'dayjs';
import { BagLocation } from '../bag-destination/BagLocation';
import { BagActivitySummary } from './BagActivitySummary';
import { WeatherSnapshot } from '../weather/WeatherTypes';

class BagItem {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly weight: string,
    private readonly editDate: Dayjs,
    private readonly startDate: Dayjs,
    private readonly endDate: Dayjs,
    private readonly gears: string[] = [],
    private readonly packedGears: string[] = [],
    // 설정된 여행지(DM-15). 배낭 선택 시트가 기존 여행지명 표시·박지 링크 비교에 쓴다(DST-5). 없으면 null.
    private readonly location: BagLocation | null = null,
    // 여행지 날씨 스냅샷(DM 날씨 계약). 장비 상세 타임라인의 날씨 요약에 쓴다(GD-10). 없으면 null.
    private readonly weather: WeatherSnapshot | null = null,
    // 연결된 운동 기록 요약(DM-22). 장비 상세 활동 누적에 쓴다(GD-11). 없으면 null.
    private readonly activity: BagActivitySummary | null = null,
    /**
     * 생성 시각(BAG-6 `최근 추가순`). **2026-07-31 이전 문서에는 없다**(DM-5) —
     * 없으면 `editDate`로 대체하므로 여기서는 null을 허용한다.
     */
    private readonly createdAt: Dayjs | null = null
  ) {}

  public getID() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getLocation() {
    return this.location;
  }

  public getLocationName() {
    return this.location?.name ?? null;
  }

  public getWeather() {
    return this.weather;
  }

  public getActivity() {
    return this.activity;
  }

  // 이 배낭 여행지에 연결된 박지 id(DST-7). 자유 위치·미설정이면 null.
  public getCampSpotId() {
    return this.location?.campSpotId ?? null;
  }

  // 최근 수정 순 정렬용 편집일 epoch(ms).
  public getEditDateValue() {
    return this.editDate.valueOf();
  }

  // 여행 시작일 epoch(ms). 날짜가 없거나 파싱 불가면 null — 타임라인 정렬에서 뒤로 보낸다(GD-10).
  public getStartDateValue(): number | null {
    return this.startDate.isValid() ? this.startDate.valueOf() : null;
  }

  // 여행 종료일 epoch(ms). 홈이 "여행 중 / 종료 후"를 가르는 데 쓴다(HM-1).
  public getEndDateValue(): number | null {
    return this.endDate.isValid() ? this.endDate.valueOf() : null;
  }

  /**
   * 추가 순 정렬용 값(BAG-6). `createdAt`이 없으면 `editDate`로 대체한다 —
   * 수정한 적 없는 배낭은 두 값이 같고, 수정한 배낭은 실제 생성보다 뒤로 잡힌다.
   * 둘 다 쓸 수 없으면 null이며, 호출부가 날짜 정렬과 같은 규칙으로 맨 뒤에 둔다.
   */
  public getCreatedValue(): number | null {
    if (this.createdAt?.isValid()) {
      return this.createdAt.valueOf();
    }

    return this.editDate.isValid() ? this.editDate.valueOf() : null;
  }

  public getWeight() {
    return Number((Number(this.weight) / 1000).toFixed(2));
  }

  // 무게 정렬용 저장값(g). 표시용 getWeight()는 kg로 반올림해 동률이 뭉개지므로 정렬에 쓰지 않는다(BAG-6).
  // 둘 다 number라 단위를 이름에 박아 구분한다.
  // 값이 없거나 숫자가 아니면 0(빈 배낭)으로 본다.
  public getWeightGram(): number {
    return Number(this.weight) || 0;
  }

  public getEditDate() {
    return this.editDate.format('YYYY.MM.DD HH:mm');
  }

  public getDate() {
    if (this.startDate.isSame(this.endDate, 'day')) {
      return this.startDate.format('YYYY.MM.DD');
    } else {
      return `${this.startDate.format('YYYY.MM.DD')} ~ ${this.endDate.format(
        'YYYY.MM.DD'
      )}`;
    }
  }

  // 표시용 기간 문자열. 날짜가 유효하지 않으면 null(GD-10 — 없는 값은 생략).
  public getDisplayDate(): string | null {
    if (!this.startDate.isValid()) {
      return null;
    }

    return this.getDate();
  }

  public getStartDate() {
    return this.startDate.format('YYYY.MM.DD');
  }

  public getEndDate() {
    return this.endDate.format('YYYY.MM.DD');
  }

  public getPackingPercent(): number {
    // gears가 비면 0 반환
    if (this.gears.length === 0) {
      return 0;
    }

    // packedGears와 gears의 교집합 개수 계산
    const gearsSet = new Set(this.gears);
    const packedGearsSet = new Set(this.packedGears);
    let intersectionCount = 0;

    gearsSet.forEach(gearId => {
      if (packedGearsSet.has(gearId)) {
        intersectionCount++;
      }
    });

    // 완료율 = 교집합 개수 / gears 개수 × 100 (정수 반올림)
    return Math.round((intersectionCount / this.gears.length) * 100);
  }

  public hasPackingRecord(): boolean {
    // 교집합 개수 >= 1 인지 확인
    if (this.gears.length === 0) {
      return false;
    }

    const gearsSet = new Set(this.gears);
    const packedGearsSet = new Set(this.packedGears);

    for (const gearId of gearsSet) {
      if (packedGearsSet.has(gearId)) {
        return true;
      }
    }

    return false;
  }

  public isPackingComplete(): boolean {
    // gears가 비지 않고 완료율 === 100
    return this.gears.length > 0 && this.getPackingPercent() === 100;
  }
}

export default BagItem;
