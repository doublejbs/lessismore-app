import { FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import FeedGridCellView from '@/components/feed/FeedGridCellView';
import { AcgLayout } from '@/constants/DesignTokens';
import { RecommendedGear } from '@/model/feed/FeedContentTypes';
import GearRowActions from '@/model/browse/GearRowActions';
import Bag from '@/model/bag/Bag';

interface Props {
  recommendations: RecommendedGear[];
  actions: GearRowActions;
  bag: Bag;
}

// HM-12: FD-2 피드 셀을 그대로 재사용한 가로 캐러셀.
const HomeRecommendedGearsView: FC<Props> = ({
  recommendations,
  actions,
  bag,
}) => {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title='추천 장비' subtitle='운영자가 고른 장비' />
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {recommendations.map(({ content, gear }) => (
          <View key={gear.getId()} style={styles.card}>
            <FeedGridCellView
              gear={gear}
              actions={actions}
              bag={bag}
              summary={content.summary || undefined}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  content: {
    gap: 16,
    paddingRight: AcgLayout.screenPadding,
  },
  card: {
    width: 170,
  },
});

export default HomeRecommendedGearsView;
