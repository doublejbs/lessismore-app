/**
 * 사진을 고르는 두 자리(BS-2).
 *
 * 배경과 폴라로이드는 **다르게 동작한다** — 크롭 편집 여부(BS-2)와 애널리틱스
 * 파라미터(BS-6)가 이 값으로 갈린다.
 */
enum PhotoPickTarget {
  // 캔버스를 채우는 배경 사진. 크롭 편집 없이 원본을 받는다.
  Background = 'background',
  // 폴라로이드 안에 인화되는 사진. 영역이 정사각이라 1:1로 잘라 받는다.
  Polaroid = 'polaroid',
}

export default PhotoPickTarget;
