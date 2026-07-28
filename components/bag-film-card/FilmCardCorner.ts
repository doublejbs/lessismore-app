/**
 * 요소가 처음 놓이는 캔버스 모서리(BS-9).
 *
 * 둘 다 가운데에 두면 나중에 켠 요소가 앞 요소를 완전히 덮어 "사라진 것처럼" 보이므로,
 * 폴라로이드는 좌측 상단·패킹리스트은 우측 하단에서 시작한다. 실제로 쓰는 두 모서리만 둔다.
 */
enum FilmCardCorner {
  TopLeft = 'topLeft',
  BottomRight = 'bottomRight',
}

export default FilmCardCorner;
