// AD-1 빈도. 목록의 첫 광고는 6번째 항목 뒤, 이후 10개마다 하나다.
export const AD_FIRST_POSITION = 6;

export const AD_INTERVAL = 10;

// AD-5: 화면에 가까워진 광고만 요청한다 — 화면에 보이는 마지막 항목에서 이만큼 앞선 자리까지.
// 광고 간격(10)보다 조금 넓어 다음 광고 하나만 미리 받는다.
export const AD_REQUEST_LOOKAHEAD = 12;
