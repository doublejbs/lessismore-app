// 그리기 모드가 무엇을 하는지 (RD-7). 측정 `click_route_draw_save`의 `mode` 값이 그대로 이 문자열이다.
enum RouteDrawMode {
  // 새 코스를 그린다(RD-1 ~ RD-6). 저장하면 새 문서가 생긴다.
  New = 'new',
  // 그린 코스를 이어서 고친다(RD-7). 저장하면 같은 문서·같은 Storage 경로를 덮어쓴다.
  Edit = 'edit',
}

export default RouteDrawMode;
