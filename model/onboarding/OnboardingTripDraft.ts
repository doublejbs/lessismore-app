import { BagLocation } from '../bag-destination/BagLocation';
import Gear, { toGearExtra } from '../gear/Gear';
import OnboardingDestinationSource from './OnboardingDestinationSource';

export const ONBOARDING_TRIP_DRAFT_VERSION = 1;

// 초안 유효 시간 — 로그인 왕복(앱 재시작 포함)을 넘길 만큼만 둔다(OB-12).
export const ONBOARDING_TRIP_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

// 가이드에서 고른 카탈로그 장비 — 로그인 뒤 창고 등록·담기에 필요한 카탈로그 값만 담는다.
export interface OnboardingTripDraftGear {
  id: string;
  name: string;
  nameKorean: string;
  company: string;
  companyKorean: string;
  weight: number;
  category: string;
  color: string;
  createDate: number;
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
  groupId?: string;
}

/**
 * 첫 여행 가이드의 로그인 이어가기 초안(OB-12). 기기 로컬 AsyncStorage `onboarding-first-trip-draft`.
 * uid·이메일·이름 같은 개인 식별 정보는 넣지 않는다.
 */
export interface OnboardingTripDraft {
  version: number;
  savedAt: string;
  // 비로그인 재실행 때 완료 단계로 다시 열지(1회). 다시 열 때 false로 바꾼다.
  resumable: boolean;
  // `YYYY-MM-DD`. 미정이면 null.
  startDate: string | null;
  endDate: string | null;
  datesUndecided: boolean;
  location: BagLocation | null;
  // 여행지가 들어온 경로(OB-5·OB-9 destination_source). 이 필드 이전의 옛 초안엔 없다 —
  // 읽을 때는 resolveDraftDestinationSource로 폴백한다(버전은 올리지 않는다).
  destinationSource?: OnboardingDestinationSource;
  catalogGears: OnboardingTripDraftGear[];
}

export const toDraftGear = (gear: Gear): OnboardingTripDraftGear => {
  const data = gear.getData();

  return {
    id: data.id,
    name: data.name,
    nameKorean: data.nameKorean,
    company: data.company,
    companyKorean: data.companyKorean,
    weight: Number.isFinite(data.weight) ? data.weight : 0,
    category: data.category,
    color: data.color,
    createDate: data.createDate,
    ...(data.colorKorean ? { colorKorean: data.colorKorean } : {}),
    ...(data.size ? { size: data.size } : {}),
    ...(data.sizeKorean ? { sizeKorean: data.sizeKorean } : {}),
    ...(data.groupId ? { groupId: data.groupId } : {}),
  };
};

export const fromDraftGear = (data: OnboardingTripDraftGear): Gear => {
  return new Gear(
    data.id,
    data.name,
    data.company,
    data.weight ? String(data.weight) : '',
    false,
    false,
    data.category,
    [],
    [],
    [],
    data.createDate,
    data.color,
    data.companyKorean,
    data.nameKorean,
    toGearExtra(data)
  );
};

const DESTINATION_SOURCES = new Set<string>(
  Object.values(OnboardingDestinationSource)
);

// 초안의 여행지 경로 — 필드가 없거나(옛 초안) 알 수 없는 값이면 여행지 유무로 폴백한다.
// 여행지가 없으면 저장된 값과 상관없이 none이다.
export const resolveDraftDestinationSource = (
  draft: OnboardingTripDraft
): OnboardingDestinationSource => {
  if (!draft.location) {
    return OnboardingDestinationSource.None;
  }

  const source = draft.destinationSource;

  if (
    typeof source === 'string' &&
    DESTINATION_SOURCES.has(source) &&
    source !== OnboardingDestinationSource.None
  ) {
    return source;
  }

  return OnboardingDestinationSource.Picker;
};

// 저장된 값을 검증한다 — 버전이 다르거나 유효 시간이 지났으면 버린다(null).
export const parseOnboardingTripDraft = (
  value: unknown,
  now: number
): OnboardingTripDraft | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const draft = value as Partial<OnboardingTripDraft>;

  if (
    draft.version !== ONBOARDING_TRIP_DRAFT_VERSION ||
    typeof draft.savedAt !== 'string' ||
    !Array.isArray(draft.catalogGears)
  ) {
    return null;
  }

  const savedAt = Date.parse(draft.savedAt);

  if (
    !Number.isFinite(savedAt) ||
    now - savedAt > ONBOARDING_TRIP_DRAFT_TTL_MS
  ) {
    return null;
  }

  return draft as OnboardingTripDraft;
};
