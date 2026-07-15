// 장소 검색(지오코딩) 결과 한 건(BagDestination DST-4).
export interface GeocodeResult {
  // 장소명(Kakao place_name).
  name: string;
  latitude: number;
  longitude: number;
  // 검색 리스트 보조 표시용 주소.
  subtitle?: string;
}
