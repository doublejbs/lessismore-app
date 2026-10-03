/**
 * 지도 `내 위치` 버튼의 상태 (BD-11 · GRP-10 방향 모드). 버튼을 누를 때마다
 * `Off` → `Located` → `Heading` → `Off`로 돈다.
 *
 * - `Off`: 아무것도 따라가지 않는다. 누르면 내 위치로 카메라를 옮긴다(①).
 * - `Located`: 방금 내 위치로 옮겼다. 다시 누르면 방향 모드로 들어간다(②).
 * - `Heading`: 카메라가 내 위치를 따라가고 지도가 바라보는 방향으로 돈다. 누르면 북쪽 위로 되돌린다(③).
 */
enum MyLocationMode {
  Off = 'Off',
  Located = 'Located',
  Heading = 'Heading',
}

export default MyLocationMode;
