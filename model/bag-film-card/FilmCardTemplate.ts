/**
 * 필름 카드 템플릿(BS-7).
 *
 * `Polaroid`는 사진 + 여행 요약 4값을 인화지 프레임에 얹는 감성 카드(BS-3)이고,
 * `Label`은 사진 배경 위에 장비 목록을 흰 텍스트로 얹는 스펙 라벨(BS-8)이다.
 * 사진·비율·공유·저장 로직은 두 템플릿이 공유한다.
 */
enum FilmCardTemplate {
  Polaroid = 'polaroid',
  Label = 'label',
}

export default FilmCardTemplate;
