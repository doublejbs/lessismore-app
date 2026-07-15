import { Dayjs } from 'dayjs';
import { BagLocation } from '../bag-destination/BagLocation';

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
    private readonly location: BagLocation | null = null
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

  // 이 배낭 여행지에 연결된 박지 id(DST-7). 자유 위치·미설정이면 null.
  public getCampSpotId() {
    return this.location?.campSpotId ?? null;
  }

  // 최근 수정 순 정렬용 편집일 epoch(ms).
  public getEditDateValue() {
    return this.editDate.valueOf();
  }

  public getWeight() {
    return Number((Number(this.weight) / 1000).toFixed(2));
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
