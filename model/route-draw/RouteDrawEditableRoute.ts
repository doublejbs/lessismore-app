import { RouteCoordinate, RouteDrawnPoint } from '@/model/route/RouteData';

/**
 * 수정 모드(RD-7)가 다시 여는 코스 — 배낭 코스(`BagRoute`)와 그룹 코스(`GroupRoute`)가 함께 만족한다.
 * 찍은 점(`getDrawnPoints`)과 저장된 방향 그대로의 축약 좌표(`getStoredSimplified`)로 구간을 되살린다.
 */
export interface RouteDrawEditableRoute {
  getId(): string;
  getName(): string;
  getDistance(): number;
  isDrawn(): boolean;
  getDrawnPoints(): readonly RouteDrawnPoint[];
  getStoredSimplified(): RouteCoordinate[];
}
