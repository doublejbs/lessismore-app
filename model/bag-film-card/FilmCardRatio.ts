/**
 * 필름 카드 내보내기 캔버스 비율(BS-3).
 *
 * `Card`는 폴라로이드 그 자체를 내보내고, 나머지는 검은 배경 캔버스 가운데에
 * 폴라로이드를 얹어 SNS 피드(4:5)·스토리(9:16) 규격에 맞춘다.
 */
enum FilmCardRatio {
  Card = 'card',
  Feed = 'feed',
  Story = 'story',
}

export default FilmCardRatio;
