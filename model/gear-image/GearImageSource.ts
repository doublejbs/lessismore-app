/**
 * 장비 사진의 출처(GD-13) — 앨범 선택과 카메라 촬영 두 갈래를 제공한다.
 *
 * 요청하는 권한(사진 접근 / 카메라 접근)과 호출하는 `expo-image-picker` 진입점이
 * 이 값으로 갈린다.
 */
enum GearImageSource {
  Library = 'library',
  Camera = 'camera',
}

export default GearImageSource;
