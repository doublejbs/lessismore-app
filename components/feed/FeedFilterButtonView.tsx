import { FC, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Feed from '@/model/feed/Feed';
import PretendardText from '@/components/PretendardText';
import FeedFilterSheetView from './FeedFilterSheetView';
import app from '@/model/app/App';

interface Props {
  feed: Feed;
}

const FILTER_LABEL = '필터';

const RANKING_LABEL = '인기 순위';

// 탭바 위 오프셋. Android는 0이면 버튼이 탭바에 붙어 마지막 카드를 가리므로 여백을 준다.
// (창고 `장비 추가`(AddButtonView)는 우측 하단이라 겹침이 덜하지만, 피드 중앙 버튼은 더 명확한 여백이 필요.)
const BOTTOM_OFFSET = Platform.select({
  ios: 80,
  android: 20,
  default: 80,
});

// FD-3: 피드 하단 플로팅 버튼 묶음.
// 중앙 검정 필 `필터`(활성 필터 개수 표기) → 통합 필터 시트, 우측 보조 필 `인기 순위` → 전용 화면.
// 컨테이너는 pointerEvents='box-none'으로 버튼 외 영역의 피드 스크롤을 방해하지 않는다.
const FeedFilterButtonView: FC<Props> = ({ feed }) => {
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);

  const activeCount = feed.getActiveFilterCount();
  const filterLabel =
    activeCount > 0 ? `${FILTER_LABEL} ${activeCount}` : FILTER_LABEL;

  const handleOpenFilter = () => {
    app.getAnalyticsManager()?.logClick('feed_filter');
    setSheetVisible(true);
  };

  const handleCloseFilter = () => {
    setSheetVisible(false);
  };

  const handleGoToRanking = () => {
    app.getAnalyticsManager()?.logClick('feed_ranking');
    router.push('/popular-ranking');
  };

  return (
    <>
      <View style={styles.container} pointerEvents='box-none'>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleOpenFilter}
          activeOpacity={0.85}
        >
          <PretendardText style={styles.filterButtonText} weight='semibold'>
            {filterLabel}
          </PretendardText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rankingButton}
          onPress={handleGoToRanking}
          activeOpacity={0.85}
        >
          <PretendardText style={styles.rankingButtonText} weight='semibold'>
            {RANKING_LABEL}
          </PretendardText>
        </TouchableOpacity>
      </View>

      <FeedFilterSheetView
        feed={feed}
        visible={sheetVisible}
        onClose={handleCloseFilter}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_OFFSET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  filterButton: {
    minHeight: 48,
    borderRadius: 32,
    backgroundColor: 'black',
    borderWidth: 1,
    borderColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  filterButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: 'white',
  },
  rankingButton: {
    minHeight: 48,
    borderRadius: 32,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 8,
  },
  rankingButtonText: {
    fontSize: 16,
    lineHeight: 20,
    color: 'black',
  },
});

export default observer(FeedFilterButtonView);
