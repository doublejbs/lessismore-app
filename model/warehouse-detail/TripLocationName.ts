/**
 * 여행 카드에 얹는 여행지 이름을 줄이는 규칙(GD-10).
 *
 * 배낭의 `location.name`에는 짧은 지명(`북한산`)과 전체 주소(`경기도 성남시 분당구 미금일로 12`)가
 * 섞여 있다(DM-19). 전체 주소는 카드 메타 줄에서 한 줄 말줄임에 걸려 **단어 중간에서 잘려**
 * (`경기도 성남시 분당구 미금일로…`) 어디였는지도 알 수 없고 잘렸다는 사실만 남았다
 * (2026-08-11 디자인 리뷰).
 *
 * 그래서 자르는 자리를 글자 수가 아니라 **행정 단위**로 정한다 — 시·군·구까지 남기고 뒤(읍·면·동·
 * 도로명·번지)는 버린다. 여행 기록에서 알아야 하는 건 어느 지역이었나이지 번지수가 아니다.
 */

// 주소 토큰의 마지막 행정 단위. 시·군·구 중 **가장 뒤에 오는 것**까지 남긴다 —
// `경기도 성남시 분당구`처럼 시와 구가 함께 오는 주소가 있다.
const DISTRICT_SUFFIX = /[시군구]$/;

export const shortenLocationName = (name: string): string => {
  const tokens = name.trim().split(/\s+/);
  const lastDistrictIndex = tokens.reduce(
    (found, token, index) => (DISTRICT_SUFFIX.test(token) ? index : found),
    -1
  );

  // 행정 단위가 없으면 주소가 아니라 지명(`북한산국립공원`·`대둔산 자연휴양림`)이다 — 그대로 둔다.
  if (lastDistrictIndex === -1) {
    return name.trim();
  }

  return tokens.slice(0, lastDistrictIndex + 1).join(' ');
};
