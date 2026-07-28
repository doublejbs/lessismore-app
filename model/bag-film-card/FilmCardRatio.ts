/**
 * 필름 카드 내보내기 캔버스 비율(BS-7).
 *
 * 캔버스는 언제나 사진이 채우므로 SNS 피드(4:5)·스토리(9:16) 두 규격만 둔다.
 * 폴라로이드가 캔버스 그 자체이던 시절에 있던 `카드` 비율은, 사진이 캔버스가 되면서
 * 전제가 사라져 없앴다 — 되살리지 말 것.
 */
enum FilmCardRatio {
  Feed = 'feed',
  Story = 'story',
}

export default FilmCardRatio;
