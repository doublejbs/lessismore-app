import PointType from '@/model/point/PointType';
import { RouteCoordinate } from '@/model/route/RouteData';
import RouteReplaySource from './RouteReplaySource';

/** 리플레이에 얹을 지도 포인트 한 개(BD-14 포인트 — 유형색 원 + 이름). */
export interface RouteReplayPoint {
  latitude: number;
  longitude: number;
  title: string;
  type: PointType;
  color: string;
}

/**
 * 리플레이 화면에 넘기는 진입 데이터(RR-1). 운동 기록 경로는 기기 메모리에만 있어(HA-5)
 * 라우트 파라미터 대신 `RouteReplayStore`에 담아 넘긴다.
 */
export interface RouteReplayRequest {
  title: string;
  source: RouteReplaySource;
  coordinates: RouteCoordinate[];
  points: RouteReplayPoint[];
}
