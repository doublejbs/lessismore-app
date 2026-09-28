// SUB-1·§4: RevenueCat **공개** SDK 키(`appl_…`/`goog_…`). 번들에 들어가는 공개값이라 레포에 둔다.
// 웹훅 인증 값·RevenueCat 비밀 API 키는 여기에 두지 않는다.
//
// 비어 있으면 구독 기능 전체가 꺼진다 — SDK를 설정하지 않고, 설정 행을 숨기고, 미구독으로 본다
// (광고는 구독 상태를 기다리지 않고 바로 요청한다).
const RevenueCatKeys = {
  ios: 'appl_OISfHQiBHNWcDeGAFYBSicsHYmR',
  android: 'goog_hyVjuCMTFzrWwjBtDtlvPndLyZj',
};

export default RevenueCatKeys;
