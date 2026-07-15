// 배낭 여행지의 단일 원본(BagDestination DST-1). Firestore `bag.location` 필드(DM-15).
// 이 도메인이 여행지를 소유하고, 날씨 도메인은 좌표를 읽기만 한다.
export interface BagLocation {
  // 표시용 지명/주소. 자유 위치는 지오코딩 결과 또는 검색 장소명, 박지 연결은 선택 당시 박지명 스냅샷.
  name: string;
  latitude: number;
  longitude: number;
  // 연결된 등록 박지(`/camp-spot/{campSpotId}`, DM-17) 참조. 박지 선택 시에만 존재한다.
  // 이름·좌표는 참조와 별도로 항상 저장해 박지 삭제·비활성·조회 실패에도 여행지를 유지한다(DST-7).
  campSpotId?: string;
}
