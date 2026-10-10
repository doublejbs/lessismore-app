import { FC, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import CommunityFeed from '@/model/community-feed/CommunityFeed';
import CommunityFeedDispatcher from '@/model/community-feed/CommunityFeedDispatcher';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityView from './CommunityView';

const toFeedFilter = (
  value: string | undefined
): CommunityFeedFilter | null => {
  const filters = Object.values(CommunityFeedFilter) as string[];

  return value && filters.includes(value)
    ? (value as CommunityFeedFilter)
    : null;
};

const CommunityWrapper: FC = () => {
  const router = useRouter();
  const { filter, spot, spotName } = useLocalSearchParams<{
    filter?: string;
    spot?: string;
    spotName?: string;
  }>();
  const [feed] = useState(() =>
    CommunityFeed.from(CommunityFeedDispatcher.new())
  );

  /**
   * 라우트 파라미터(HM-17 `더 보기`의 filter, CS-11 `전체 보기`의 spot)를 적용한다.
   * 초기화 effect보다 먼저 선언해, 첫 진입이면 값이 먼저 들어가 첫 조회부터 그 조건으로 나간다.
   * 소비한 파라미터는 지워 같은 링크로 다시 와도(칩을 바꾼 뒤 재진입) 다시 적용되게 한다.
   */
  useEffect(() => {
    if (!filter && !spot) {
      return;
    }

    void feed.applyRouteParams(
      toFeedFilter(filter),
      spot ?? null,
      spotName ?? ''
    );
    router.setParams({
      filter: undefined,
      spot: undefined,
      spotName: undefined,
    });

    // 박지 칩 라벨 — 넘겨받은 이름이 없으면 공개 박지 문서에서 읽는다(CS-11).
    if (spot && !spotName) {
      void (async () => {
        try {
          const found = await app.getCampSpotStore()?.getSpot(spot);

          feed.setSpotName(spot, found?.name ?? '');
        } catch {
          // 라벨을 못 읽어도 필터는 동작한다 — 칩은 기본 라벨로 둔다.
        }
      })();
    }
  }, [feed, filter, router, spot, spotName]);

  useEffect(() => {
    void feed.initialize();

    return () => {
      feed.dispose();
    };
  }, [feed]);

  return <CommunityView feed={feed} />;
};

export default observer(CommunityWrapper);
