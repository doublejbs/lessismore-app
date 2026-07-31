import { useRouter } from 'expo-router';
import app from '@/model/app/App';

/**
 * 창고의 `장비 추가` 진입 동작(GE-8).
 *
 * 헤더 버튼과 (구)플로팅 버튼이 같은 동작을 하므로 로그인 게이트·계측·목적지를 한 곳에 둔다 —
 * 각자 들고 있으면 비로그인 처리를 한쪽에서 빠뜨리기 쉽다.
 */
const useGearAddAction = () => {
  const router = useRouter();

  return () => {
    app.getAnalyticsManager()?.logClick('gear_add');

    if (app.getFirebase().isLoggedIn()) {
      // GE-8: 검색/직접 선택 시트로 진입(창고 컨텍스트).
      router.push('/gear-add-options');
    } else {
      app.getLogInAlertManager()?.show();
    }
  };
};

export default useGearAddAction;
