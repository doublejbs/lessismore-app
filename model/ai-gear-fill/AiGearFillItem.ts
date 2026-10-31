import AiGearFillPriority from './AiGearFillPriority';
import AiGearFillSource from './AiGearFillSource';

// 서버 응답 `result.items[]` 한 건의 원본 모양(AS-13).
export interface AiGearFillItemData {
  gearId: string;
  source: string;
  name: string;
  brand: string;
  weightG: number;
  group: string;
  priority: string;
  reason: string;
}

/**
 * 추천 장비 한 건(AS-13·AS-14). 서버가 이미 검증한 값이지만, 앱이 그리는 데 필요한 모양으로
 * 한 번 더 좁힌다 — 모르는 출처·우선순위는 버리고, 무게가 숫자가 아니면 0으로 둔다.
 * v1 결과는 전부 창고 장비(AS-13)라 출처는 검증에만 쓰고 보관·표시하지 않는다(AS-14).
 */
class AiGearFillItem {
  public static from(data: AiGearFillItemData): AiGearFillItem | null {
    if (typeof data?.gearId !== 'string' || data.gearId === '') {
      return null;
    }

    const source = Object.values(AiGearFillSource).find(
      value => value === data.source
    );
    const priority = Object.values(AiGearFillPriority).find(
      value => value === data.priority
    );

    // v1 계약은 창고 장비만이다(AS-13) — 다른 출처가 오면 행으로 그리지 않는다.
    if (source !== AiGearFillSource.Warehouse || !priority) {
      return null;
    }

    const weightG = Number(data.weightG);

    return new AiGearFillItem(
      data.gearId,
      typeof data.name === 'string' ? data.name : '',
      typeof data.brand === 'string' ? data.brand : '',
      Number.isFinite(weightG) && weightG > 0 ? Math.round(weightG) : 0,
      priority,
      typeof data.reason === 'string' ? data.reason : ''
    );
  }

  private constructor(
    private readonly gearId: string,
    private readonly name: string,
    private readonly brand: string,
    private readonly weightG: number,
    private readonly priority: AiGearFillPriority,
    private readonly reason: string
  ) {}

  public getGearId() {
    return this.gearId;
  }

  public getName() {
    return this.name;
  }

  public getBrand() {
    return this.brand;
  }

  public getWeightG() {
    return this.weightG;
  }

  public isEssential() {
    return this.priority === AiGearFillPriority.Essential;
  }

  public getReason() {
    return this.reason;
  }
}

export default AiGearFillItem;
