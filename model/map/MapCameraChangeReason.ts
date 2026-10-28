// 지도 카메라가 움직인 이유 (MAP-2). MapLibre의 `userInteraction`이면 `Gesture`, 그 밖(코드의 이동)은 `Developer`.
// `Control`은 지도 기본 컨트롤(나침반 탭 등)이다 — MapLibre는 따로 알려 주지 않아 지금은 `Gesture`로 들어온다.
enum MapCameraChangeReason {
  Gesture = 'Gesture',
  Control = 'Control',
  Developer = 'Developer',
}

export default MapCameraChangeReason;
