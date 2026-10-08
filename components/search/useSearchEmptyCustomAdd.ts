import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import SearchEmptySource from '@/model/search/SearchEmptySource';

interface Options {
  source: SearchEmptySource;
  // 있으면 배낭 컨텍스트 — 저장 시 창고 + 이 배낭에 담는 수동 폼으로 간다(GE-3).
  bagId?: string | undefined;
}

/**
 * SR-11 검색 결과 없음 `직접 추가` 동작.
 *
 * 다섯 자리(탐색 탭·`/search` 모달·창고·배낭 편집)가 같은 동작을 하므로 로그인 게이트·계측·
 * 목적지를 한 곳에 둔다 — 창고 `장비 추가`(useGearAddAction)와 같은 이유다.
 * 검색어는 trim해 수동 폼의 제품명 프리필(`?name=`, GE-8)로 넘긴다.
 */
const useSearchEmptyCustomAdd = ({ source, bagId }: Options) => {
  const router = useRouter();

  return (query: string) => {
    app.getAnalyticsManager()?.logClick('search_empty_custom_add', { source });

    if (!app.getFirebase().isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    const name = query.trim();

    if (bagId) {
      router.push({
        pathname: '/custom/bag-gear/[id]',
        params: { id: bagId, name },
      });
    } else {
      router.push({ pathname: '/custom', params: { name } });
    }
  };
};

export default useSearchEmptyCustomAdd;
