import GearFilter from './GearFilter';
import {
  getFineCategoryLabel,
  getGroupForCategory,
} from './GearCategoryGroups';
import { isOwnGearImageUrl } from '../gear-image/GearImageOwnership';
import { stripNameAnnotation } from './GearDisplayName';

// 웹 크롤 파이프라인이 기록하는 신규 옵셔널 필드 + 사용자 업로드 사진(imageUrl) 묶음(DM-3).
// exactOptionalPropertyTypes — 값이 없으면 키 자체를 생략한다.
export interface GearExtra {
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
  groupId?: string;
  specs?: Record<string, string | number | boolean>;
  imageUrl?: string;
}

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value !== '';
};

// 크롤 원본 색상값은 `black`처럼 소문자 영문이라 그대로 노출하면 표시 품질이 떨어진다(DM-3).
// 첫 글자만 올리고 나머지는 건드리지 않는다 — 한글(`블랙`)이나 이미 대문자로 시작하는
// 값(`Black`·`BLACK`)은 그대로 남는다.
const capitalizeFirstLetter = (value: string) => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

// Firestore 문서·Algolia hit의 느슨한 데이터를 GearExtra로 정규화한다.
// 문자열/객체 타입 가드를 통과한 값만 포함하고, 빈 값은 키를 생략한다.
//
// **imageUrl은 여기서 담지 않는다.** 같은 필드라도 문서 경로에 따라 의미가 달라서,
// 카탈로그(`gear/{id}`)의 값은 브랜드 크롤 이미지라 앱이 읽으면 안 되고
// 사용자 문서(`users/{uid}/gears/{id}`)의 값만 본인이 올린 사진이다(DataModel §1 2026-07-29 개정, DM-3).
// 데이터만 봐서는 출처를 구분할 수 없으므로 **호출부가 함수 선택으로 구분**한다 —
// 기본형인 이 함수는 어느 경로에서 불려도 안전하도록 imageUrl을 무시하고,
// 보는 사람이 업로더 본인인 화면만 아래 toOwnerGearExtra를 쓴다.
export const toGearExtra = (data: {
  colorKorean?: unknown;
  size?: unknown;
  sizeKorean?: unknown;
  groupId?: unknown;
  specs?: unknown;
}): GearExtra => {
  const isSpecsObject = (
    value: unknown
  ): value is Record<string, string | number | boolean> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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

// **보는 사람이 업로더 본인인 화면에서만** 쓴다 — toGearExtra에 imageUrl을 더한다(DM-3, GD-13).
// "사용자 문서에서 읽으니까 쓴다"가 아니다: 같은 `users/{uid}/gears`를 읽더라도 공유 배낭
// (`BagStore.getSharedBag`, BD-7)처럼 제3자가 보는 표면은 toGearExtra를 써야 한다(DataModel §1 비공개 원칙).
//
// 문서에 값이 있다고 본인 사진인 것도 아니다 — 2026-07-28 이전 register()가 카탈로그 크롤
// 이미지 URL을 사용자 문서에 복사 저장했다. 그래서 Storage 경로가 `{userId}/`로 시작할 때만
// 인정한다(GearImageOwnership §1). 그 밖(크롤 `gears/`·외부 호스트·형식 불명)은 전부 버린다.
export const toOwnerGearExtra = (
  data: {
    colorKorean?: unknown;
    size?: unknown;
    sizeKorean?: unknown;
    groupId?: unknown;
    specs?: unknown;
    imageUrl?: unknown;
  },
  userId: string
): GearExtra => {
  const imageUrl = isNonEmptyString(data.imageUrl) ? data.imageUrl : '';

  return {
    ...toGearExtra(data),
    ...(isOwnGearImageUrl(imageUrl, userId) ? { imageUrl } : {}),
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

  /**
   * 화면에 내놓는 이름 — 한글 우선(`nameKorean || name`)에 카탈로그 주석 정리를 더한다(DM-3).
   * 재고 상태 대괄호 접미(`[품절]`)를 떼는 곳이 여기 하나라, 창고·배낭·검색이 같은 이름을 쓴다.
   * 캐논컬 값이 필요한 자리(편집 프리필·중복 판정·정렬)는 `getName()`을 쓴다.
   */
  public getDisplayName() {
    return stripNameAnnotation(this.nameKorean || this.name);
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
      // 사용자가 올린 본인 장비 사진은 다시 저장한다 — 값이 빠진 페이로드로 문서를 갱신하면
      // 장비를 수정할 때마다 사진이 사라진다(DataModel §1 2026-07-29 개정, DM-3, GD-13).
      ...(this.extra.imageUrl ? { imageUrl: this.extra.imageUrl } : {}),
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

  // 색상 표시값 — 한글 우선(colorKorean || color, DM-3).
  // colorKorean이 없어 크롤 원본값으로 떨어질 때만 첫 글자를 대문자로 정규화한다
  // (한글 매핑 확대는 별도 과제). 표시 정규화는 이 접근자 한 곳에서만 한다.
  public getDisplayColor() {
    const colorKorean = this.extra.colorKorean;

    if (colorKorean) {
      return colorKorean;
    }

    return capitalizeFirstLetter(this.color);
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

  // 사용자가 올린 본인 장비 사진의 다운로드 URL(GD-13). 카탈로그 크롤 이미지는 Storage 경로
  // 판별에서 걸러지므로(toOwnerGearExtra 주석 참고) 값이 있으면 곧 본인 업로드다. 없으면 undefined.
  public getImageUrl(): string | undefined {
    return this.extra.imageUrl;
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
