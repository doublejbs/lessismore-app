/**
 * 표시용 장비 이름을 다듬는 규칙([DataModel.md](../../specs/DataModel.md) DM-3).
 *
 * `/gear` 카탈로그의 `name`·`nameKorean`에는 크롤 원본의 **재고·판매 상태 주석**이 이름 끝에
 * 대괄호로 붙어 있다(`마운틴 스패츠 라지 [품절]`). 카탈로그(쇼핑) 문맥에서는 뜻이 있었지만
 * 내 창고·내 배낭 목록에서는 이미 가진 물건에 남의 재고 상태가 따라다니는 셈이라 읽을 이유가
 * 없다(2026-08-11 디자인 리뷰).
 *
 * 그래서 **표시 게터 한 곳**(`Gear.getDisplayName()`)에서만 떼고, 캐논컬 값(`getName()` —
 * 편집 폼 프리필·중복 판정·`orderBy('name')`)은 저장값 그대로 둔다. 화면마다 각자 떼면
 * 창고에서는 사라진 접미가 검색 결과에는 남는다.
 */

/**
 * 이름 끝에 붙은 대괄호 주석. `[품절] [재입고]`처럼 연달아 붙는 경우가 있어 한 덩어리로 묶어
 * 지운다. **끝에 붙은 것만** 대상이다 — `[단독]`처럼 앞에 오는 값은 이름의 일부로 읽히고,
 * 가운데 대괄호는 규격 표기(`텐트 [2인용] 풋프린트`)일 수 있다.
 */
const TRAILING_ANNOTATION = /(?:\s*\[[^[\]]*\])+\s*$/;

export const stripNameAnnotation = (name: string): string => {
  const stripped = name.replace(TRAILING_ANNOTATION, '').trim();

  // 이름이 통째로 대괄호였다면(`[품절]` 하나뿐) 지울 주석이 아니라 그게 곧 이름이다 —
  // 빈 이름을 내놓으면 목록 행에 정체가 사라진다.
  if (stripped === '') {
    return name.trim();
  }

  return stripped;
};
