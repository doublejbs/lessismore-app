import { Linking, Share } from 'react-native';
import app from '../app/App';
import { CampSpot } from './CampSpotTypes';

// 박지 공유·네이버 지도 열기 — 박지 상세(CS-3/CS-7)와 지도 요약 시트(CS-2)가 공유하는 동작.
// spot만 있으면 되는 순수 동작이라 모델 밖으로 빼 두 화면이 같은 구현을 쓴다.

// 공유(CS-7): 박지 웹 랜딩 URL을 OS 공유 시트로 내보낸다.
// 랜딩(useless.my/camp-share/{id})에서 앱으로 딥링크(lessismoreapp://camp-site/{id})된다.
export const shareCampSpot = async (spot: CampSpot) => {
  app.getAnalyticsManager()?.logClick('camp_site_share');

  // 문서 id에 콜론(예: curated:seokseongsan)이 들어가 있다. 메신저의 URL 자동 링크화가
  // 콜론에서 끊겨 링크가 깨지므로 퍼센트 인코딩(%3A)한다 — 웹 랜딩(React Router)이 복원한다.
  const url = `https://useless.my/camp-share/${encodeURIComponent(spot.id)}`;

  try {
    // URL만 공유한다 — 이름 등 텍스트를 붙이면 '복사' 시 URL이 아닌 문자열이 복사돼
    // 사파리에 붙여넣어도 링크로 동작하지 않는다.
    await Share.share({ message: url });
  } catch {
    // 공유 시트 취소·실패는 조용히 무시
  }
};

// 네이버 지도에서 열기(CS-3): 좌표·박지명으로 네이버 지도 앱을 연다.
// 앱 미설치·실패 시 네이버 지도 웹 검색으로 폴백한다.
export const openCampSpotInNaverMap = async (spot: CampSpot) => {
  app.getAnalyticsManager()?.logClick('camp_site_directions');

  const { latitude, longitude } = spot.location;
  const appUrl = `nmap://place?lat=${latitude}&lng=${longitude}&name=${encodeURIComponent(spot.name)}&appname=com.doublejbs.useless`;
  const webUrl = `https://map.naver.com/p/search/${encodeURIComponent(spot.name)}`;

  try {
    await Linking.openURL(appUrl);
  } catch {
    try {
      await Linking.openURL(webUrl);
    } catch {
      // 웹 폴백까지 실패하면 조용히 무시
    }
  }
};
