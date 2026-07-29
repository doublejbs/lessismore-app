/**
 * 장비 사진 액션 시트의 상태(GD-13).
 *
 * 시트가 **하나**라 상태도 하나다 — 사진 추가/교체 시 여는 출처 선택(`Source`)과
 * 사진을 탭했을 때 여는 교체·삭제(`Action`)를 별도 시트로 두면, 교체를 고를 때
 * RN `Modal` 두 개가 겹쳐(닫히는 중에 열림) iOS에서 두 번째 시트가 뜨지 않는다.
 * 같은 시트의 메뉴 항목만 바꾼다.
 */
enum GearImageSheet {
  None = 'none',
  Source = 'source',
  Action = 'action',
}

export default GearImageSheet;
