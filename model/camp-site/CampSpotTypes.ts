import CampSiteType from './CampSiteType';
import CampSiteFacility from './CampSiteFacility';
import CampSiteTag from './CampSiteTag';

// /camp-spot 문서 계약 (DataModel DM-17). 관리 스크립트로만 적재하고 클라이언트는 읽기 전용.
// 옵셔널 필드는 exactOptionalPropertyTypes 규칙에 맞춰 `?`로만 선언한다(undefined 값 대입 금지).
export interface CampSpotData {
  name: string;
  type: CampSiteType;
  location: {
    latitude: number;
    longitude: number;
  };
  region: string;
  // 시/군/구 단위 지역명(DM-17) — Kakao coord2regioncode의 region_2depth_name.
  // 백필 이전에 적재된 옛 문서엔 없을 수 있어 옵셔널이며, 표시는 getCampSpotRegionLabel로 폴백한다.
  city?: string;
  description: string;
  facilities: CampSiteFacility[];
  // 지형·특징 태그 (DM-17). 없으면 태그 필터 선택 시 제외된다.
  tags?: CampSiteTag[];
  accessInfo?: string;
  // 시드 멱등성 키(DM-17) — 문서 id는 무작위라 (source, sourceKey)로 재실행 매칭. 표시엔 안 씀.
  sourceKey?: string;
  warnings?: string;
  imageUrl?: string;
  source: string;
  status: string;
  updatedAt: string;
}

// 문서 id를 포함한 조회 결과 형태.
export interface CampSpot extends CampSpotData {
  id: string;
}
