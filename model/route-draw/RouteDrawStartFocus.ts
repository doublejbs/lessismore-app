/**
 * 새로 그리기를 시작할 때 카메라를 옮길 여행지 (RD-9 #2). 화면이 주입한다 — 배낭은 여행지(`bag.location`, DM-15),
 * 그룹은 연결 박지. `showPin`이면 그 자리에 이름 캡션 핀을 띄운다(그룹은 박지 핀이 이미 지도에 있어 띄우지 않는다).
 */
export interface RouteDrawStartFocus {
  latitude: number;
  longitude: number;
  name: string;
  showPin: boolean;
}

/** 지도가 받아 한 번 옮기는 시작 카메라 요청. `seq`가 그리기를 시작할 때마다 올라 같은 자리여도 새 요청이 된다. */
export interface RouteDrawStartCamera {
  latitude: number;
  longitude: number;
  seq: number;
}
