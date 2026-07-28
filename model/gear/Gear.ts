import GearFilter from './GearFilter';
import {
  getFineCategoryLabel,
  getGroupForCategory,
} from './GearCategoryGroups';

// 웹 크롤 파이프라인이 기록하는 신규 옵셔널 필드 묶음(DM-3).
// exactOptionalPropertyTypes — 값이 없으면 키 자체를 생략한다.
export interface GearExtra {
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
  groupId?: string;
  specs?: Record<string, string | number | boolean>;
}

// Firestore 문서·Algolia hit의 느슨한 데이터를 GearExtra로 정규화한다.
// 문자열/객체 타입 가드를 통과한 값만 포함하고, 빈 값은 키를 생략한다.
export const toGearExtra = (data: {
  colorKorean?: unknown;
  size?: unknown;
  sizeKorean?: unknown;
  groupId?: unknown;
  specs?: unknown;
}): GearExtra => {
  const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === 'string' && value !== '';
  };

  const isSpecsObject = (
    value: unknown
  ): value is Record<string, string | number | boolean> => {
    return (
      typeof value === 'object' && value !== null && !Array.isArray(value)
    );
  };

  return {
    ...(isNonEmptyString(data.colorKorean)
      ? { colorKorean: data.colorKorean }
      : {}),
    ...(isNonEmptyString(data.size) ? { size: data.size } : {}),
    ...(isNonEmptyString(data.sizeKorean)
      ? { sizeKorean: data.sizeKorean }
      : {}),
    ...(isNonEmptyString(data.groupId) ? { groupId: data.groupId } : {}),
    ...(isSpecsObject(data.specs) ? { specs: data.specs } : {}),
  };
};

class Gear {
  public constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly company: string,
    private readonly weight: string,
    private readonly added: boolean,
    private readonly isCustom: boolean,
    private readonly category: string,
    private useless: string[],
    private used: string[],
    private bags: string[],
    private createDate: number,
    private color: string,
    private companyKorean: string,
    private readonly nameKorean: string = '',
    private readonly extra: GearExtra = {}
  ) {}

  public hasId(value: string) {
    return this.getId() === value;
  }

  public isSame(value: Gear) {
    return this.getId() === value.getId();
  }

  public getName() {
    return this.name;
  }

  public getDisplayName() {
    return this.nameKorean || this.name;
  }

  public getNameKorean() {
    return this.nameKorean;
  }

  public getCompany() {
    return this.company;
  }

  public getDisplayCompany() {
    return this.companyKorean || this.company;
  }

  public getWeight() {
    return this.weight;
  }

  public getId() {
    return this.id;
  }

  public getCategory() {
    return this.category;
  }

  // 세분 카테고리를 1차 그룹(GearFilter)으로 매핑한다 — 필터·차트·통계 비교용(DM-4).
  public getGroupCategory(): GearFilter {
    return getGroupForCategory(this.category);
  }

  // 세분 카테고리 한글 라벨. 매핑에 없으면 빈 문자열.
  public getFineCategoryLabel(): string {
    return getFineCategoryLabel(this.category);
  }

  public getData() {
    return {
      id: this.id,
      name: this.name,
      company: this.company,
      weight: +this.weight,
      // imageUrl은 저장하지 않는다 — 장비 이미지 미제공 원칙(DataModel §1, GE-3).
      isCustom: this.isCustom,
      category: this.category,
      useless: this.useless,
      used: this.used,
      bags: this.bags,
      createDate: this.createDate,
      color: this.color,
      companyKorean: this.companyKorean,
      nameKorean: this.nameKorean,
      // 신규 옵셔널 필드는 값이 있을 때만 포함한다(Firestore는 undefined 거부).
      ...(this.extra.colorKorean
        ? { colorKorean: this.extra.colorKorean }
        : {}),
      ...(this.extra.size ? { size: this.extra.size } : {}),
      ...(this.extra.sizeKorean ? { sizeKorean: this.extra.sizeKorean } : {}),
      ...(this.extra.groupId ? { groupId: this.extra.groupId } : {}),
      ...(this.extra.specs ? { specs: this.extra.specs } : {}),
    };
  }

  public isAdded() {
    return this.added;
  }

  public removeUseless(value: string) {
    this.useless = this.useless.filter(useless => useless !== value);

    if (this.used.includes(value)) {
      return this;
    } else {
      this.used.push(value);
      return this;
    }
  }

  public appendUseless(value: string) {
    this.used = this.used.filter(used => used !== value);

    if (this.useless.includes(value)) {
      return this;
    } else {
      this.useless.push(value);
      return this;
    }
  }

  public hasUseless(value: string) {
    return this.useless.includes(value);
  }

  public hasUsed(value: string) {
    return this.used.includes(value);
  }

  public getUseless() {
    return this.useless;
  }

  public getBags() {
    return this.bags;
  }

  public getBagCount() {
    return this.bags.length;
  }

  public getUsedCount() {
    return this.used.length;
  }

  public hasUsedRate() {
    return !isNaN(this.getUsedRate());
  }

  public getUsedRate() {
    return Math.round(
      (this.getUsedCount() / (this.getUsedCount() + this.getUselessCount())) *
        100
    );
  }

  public getUselessCount() {
    return this.useless.length;
  }

  public getUsed() {
    return this.used;
  }

  public getCreateDate() {
    return this.createDate;
  }

  public getIsCustom() {
    return this.isCustom;
  }

  public getColor() {
    return this.color;
  }

  public getCompanyKorean() {
    return this.companyKorean;
  }

  public getColorKorean() {
    return this.extra.colorKorean ?? '';
  }

  // 색상 표시값 — 한글 우선(colorKorean || color).
  public getDisplayColor() {
    return this.extra.colorKorean || this.color;
  }

  public getSize() {
    return this.extra.size ?? '';
  }

  // 사이즈 표시값 — 한글 우선(sizeKorean || size), 둘 다 없으면 빈 문자열.
  public getDisplaySize() {
    return this.extra.sizeKorean || this.extra.size || '';
  }

  public getGroupId() {
    return this.extra.groupId ?? '';
  }

  public getSpecs(): Record<string, string | number | boolean> {
    return this.extra.specs ?? {};
  }

  // 재구성(new Gear(...))에서 신규 필드를 보존할 때 사용한다.
  public getExtra(): GearExtra {
    return this.extra;
  }
}

export default Gear;
