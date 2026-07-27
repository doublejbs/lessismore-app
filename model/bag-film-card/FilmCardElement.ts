/**
 * 사진 캔버스 위에 얹는 요소(BS-7).
 *
 * 캔버스는 언제나 **사진**이고, 그 위에 아래 두 요소를 각각 독립적으로 켜고 끈다 —
 * 둘 다 올릴 수도, 하나만 올릴 수도, 아무것도 안 올릴 수도 있다.
 * `Polaroid`는 여행 요약 4값이 얹힌 인화물(BS-3), `Receipt`는 장비 목록이 찍힌 종이(BS-8)다.
 *
 * 예전에는 이 둘이 캔버스 전체를 결정하는 "템플릿"(둘 중 하나만 고르는 값)이었으나,
 * 사진이 캔버스가 되면서 켜고 끄는 요소 개념으로 바뀌었다.
 */
enum FilmCardElement {
  Polaroid = 'polaroid',
  Receipt = 'receipt',
}

export default FilmCardElement;
