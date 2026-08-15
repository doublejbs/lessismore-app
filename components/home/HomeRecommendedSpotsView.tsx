import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import { Acg, AcgRow, AcgType } from '@/constants/DesignTokens';
import {
  getCampSiteTypeColor,
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';
import { RecommendedSpot } from '@/model/feed/FeedContentTypes';
import { setPendingCampSite } from '@/model/camp-site/CampSiteMapHandoff';

interface Props {
  recommendations: RecommendedSpot[];
}

// HM-11: 운영자 추천 박지 목록. 지도 탭 상세 진입은 지도 마커 탭의 기존 경로를 재사용한다.
const HomeRecommendedSpotsView: FC<Props> = ({ recommendations }) => {
  const router = useRouter();

  if (recommendations.length === 0) {
    return null;
  }

  const handlePress = (spotId: string) => {
    setPendingCampSite(spotId);
    router.push('/map');
  };

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title='추천 박지' subtitle='운영자가 고른 박지' />
      <View>
        {recommendations.map(({ content, spot }, index) => (
          <TouchableOpacity
            key={spot.id}
            style={[styles.row, index > 0 && styles.rowDivided]}
            onPress={() => handlePress(spot.id)}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`${spot.name} 지도에서 보기`}
          >
            <View style={styles.rowText}>
              <PretendardText
                weight='medium'
                style={styles.title}
                numberOfLines={2}
              >
                {spot.name}
              </PretendardText>
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.typeDot,
                    { backgroundColor: getCampSiteTypeColor(spot.type) },
                  ]}
                />
                <PretendardText style={styles.meta} numberOfLines={1}>
                  {`${getCampSiteTypeLabel(spot.type)} · ${getCampSpotRegionLabel(spot)}`}
                </PretendardText>
              </View>
              {content.summary ? (
                <PretendardText
                  style={styles.summary}
                  numberOfLines={2}
                >
                  {content.summary}
                </PretendardText>
              ) : null}
            </View>
            <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  summary: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
});

export default HomeRecommendedSpotsView;
