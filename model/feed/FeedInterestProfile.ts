import Gear from '@/model/gear/Gear';
import { getGroupForCategory } from '@/model/gear/GearCategoryGroups';
import { toBrandKey } from '@/model/store/BrandKey';

// FD-1: 창고(카탈로그 출신 장비)에서 추출한 관심 신호.
// - topCategories: 카테고리 빈도 상위 2개(내림차순)
// - topBrands: 브랜드(toBrandKey 기준 그룹핑) 상위 2개, 대표 표시값은 최빈 companyKorean/company
// - catalogCount: 콜드스타트 판정용 카탈로그 출신 장비 총 개수
export interface FeedBrandInterest {
  companyKorean: string;
  company: string;
}

export interface FeedInterestProfile {
  topCategories: string[];
  topBrands: FeedBrandInterest[];
  catalogCount: number;
}

// 카탈로그 출신 장비 3개 미만이면 개인화 신호가 빈약하다고 보고 콜드스타트로 폴백한다(FD-1, 엣지 케이스 §6).
export const COLD_START_THRESHOLD = 3;

const TOP_CATEGORY_COUNT = 2;

const TOP_BRAND_COUNT = 2;

interface BrandBucket {
  key: string;
  count: number;
  companyKoreanCounts: Map<string, number>;
  companyCounts: Map<string, number>;
  firstSeen: number;
}

const increment = (map: Map<string, number>, key: string) => {
  const current = map.get(key) ?? 0;

  map.set(key, current + 1);
};

const pickMostFrequent = (map: Map<string, number>): string => {
  let best = '';
  let bestCount = -1;

  for (const [value, count] of map.entries()) {
    if (!value) {
      continue;
    }

    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
};

const buildTopCategories = (catalogGears: Gear[]): string[] => {
  const counts = new Map<string, number>();

  catalogGears.forEach(gear => {
    const category = gear.getCategory();

    // 세분 카테고리는 그룹 키로 정규화해 집계한다(DM-4) — tarp/tent가 같은 관심으로 묶이게.
    if (category) {
      increment(counts, getGroupForCategory(category));
    }
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORY_COUNT)
    .map(([category]) => category);
};

const buildTopBrands = (catalogGears: Gear[]): FeedBrandInterest[] => {
  const buckets = new Map<string, BrandBucket>();
  let order = 0;

  catalogGears.forEach(gear => {
    const companyKorean = gear.getCompanyKorean();
    const company = gear.getCompany();
    const key = toBrandKey(companyKorean, company);

    if (!key) {
      return;
    }

    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = {
        key,
        count: 0,
        companyKoreanCounts: new Map<string, number>(),
        companyCounts: new Map<string, number>(),
        firstSeen: order++,
      };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (companyKorean) {
      increment(bucket.companyKoreanCounts, companyKorean);
    }

    if (company) {
      increment(bucket.companyCounts, company);
    }
  });

  return Array.from(buckets.values())
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.firstSeen - b.firstSeen;
    })
    .slice(0, TOP_BRAND_COUNT)
    .map(bucket => ({
      companyKorean: pickMostFrequent(bucket.companyKoreanCounts),
      company: pickMostFrequent(bucket.companyCounts),
    }));
};

// 창고 장비 목록에서 관심 프로필을 집계한다(순수 함수).
export const buildInterestProfile = (gears: Gear[]): FeedInterestProfile => {
  const catalogGears = gears.filter(gear => !gear.getIsCustom());

  return {
    topCategories: buildTopCategories(catalogGears),
    topBrands: buildTopBrands(catalogGears),
    catalogCount: catalogGears.length,
  };
};

// FD-1: 카탈로그 출신 3개 미만이면 콜드스타트.
export const isColdStartProfile = (profile: FeedInterestProfile): boolean => {
  return profile.catalogCount < COLD_START_THRESHOLD;
};
