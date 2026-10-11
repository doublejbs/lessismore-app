import PointType from '@/model/point/PointType';

// 배낭 지도 포인트 문서 한 건 (DM-33 `bag/{bagId}/points/{pointId}`). 작성자 필드는 없다(소유자 한 사람의 것).
export interface BagPointData {
  id: string;
  type: PointType;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  createdAt: Date;
  // 수정한 적이 없으면 키가 없다.
  updatedAt?: Date;
}
