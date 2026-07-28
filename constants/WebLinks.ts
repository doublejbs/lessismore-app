// 공유 링크 웹 랜딩 베이스 URL 단일 소스.
// 커스텀 도메인 `useless.my`를 2026-07-28 폐기하고 Firebase Hosting 기본 도메인으로 통일했다
// (useless.my / lessismore-7e070.web.app / lessismore-7e070.firebaseapp.com이 같은 호스팅
// 사이트를 서빙함을 실측 확인). 도메인이 또 바뀌어도 이 파일 한 줄만 고치면 된다.
export const WEB_BASE_URL = 'https://lessismore-7e070.web.app';

// 경로 모양은 별도 레포 `lessismore` 웹 랜딩과의 계약이라 여기 한곳에 모은다.
export const getGearShareUrl = (gearId: string) => {
  return `${WEB_BASE_URL}/gear-share/${encodeURIComponent(gearId)}`;
};

export const getCampShareUrl = (spotId: string) => {
  return `${WEB_BASE_URL}/camp-share/${encodeURIComponent(spotId)}`;
};

export const getBagShareUrl = (bagId: string) => {
  // 배낭 공유는 기존부터 encodeURIComponent를 쓰지 않는다 — 그대로 유지한다
  // (인코딩을 새로 넣으면 이미 공유된 링크와 형태가 달라진다).
  return `${WEB_BASE_URL}/bag-share/${bagId}`;
};
