import PointType from './PointType';

// 포인트 등록 입력 (BD-14, DM-33). 그룹 포인트의 `GroupPointInput`과 같은 모양이다.
export interface PointInput {
  type: PointType;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

// 포인트 수정 입력. `description: null`이면 설명을 지운다.
export interface PointPatch {
  type?: PointType;
  title?: string;
  description?: string | null;
}
