import { FC } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { getCampSiteTypeLabel } from '@/model/camp-site/CampSiteLabels';

interface Props {
  // 즐겨찾기한 박지 목록(campSiteMap.getFavoriteSpots()). 로드된 활성 박지와 즐겨찾기 id 조인 결과.
  spots: CampSpot[];
  // 항목 탭 — 지도 탭은 카메라 이동, 선택기는 이 박지 선택으로 이어진다(CS-9).
  onSelect: (spot: CampSpot) => void;
  // 항목 우측 상세 버튼 — 있으면 표시하고 탭 시 박지 상세로 이동한다(지도 탭, CS-9).
  onOpenDetail?: ((spot: CampSpot) => void) | undefined;
  // 헤더 닫기 버튼 표시 여부 — 선택기 pageSheet는 넘기고, formSheet 라우트는 그래버로 닫아 생략한다.
  onClose?: () => void;
}

// 즐겨찾기 리스트 시트(CS-9)의 콘텐츠 — 헤더 + 리스트 + 빈 상태. 컨테이너(Modal·formSheet 라우트)는
// 호출자가 감싼다. 지도 탭 formSheet 라우트와 선택기 pageSheet가 이 뷰를 공유한다.
const CampSiteFavoritesListView: FC<Props> = ({
  spots,
  onSelect,
  onOpenDetail,
  onClose,
}) => {
  const renderItem = ({ item }: { item: CampSpot }) => {
    const handlePress = () => {
      onSelect(item);
    };

    const handlePressDetail = () => {
      onOpenDetail?.(item);
    };

    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.rowMain}
          onPress={handlePress}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={`${item.name} 선택`}
        >
          <PretendardText
            style={styles.rowName}
            weight='medium'
            numberOfLines={1}
          >
            {item.name}
          </PretendardText>
          <View style={styles.typeBadge}>
            <PretendardText style={styles.typeBadgeText} weight='semibold'>
              {getCampSiteTypeLabel(item.type)}
            </PretendardText>
          </View>
          <PretendardText style={styles.rowRegion} numberOfLines={1}>
            {item.region}
          </PretendardText>
        </TouchableOpacity>

        {/* 우측 상세 버튼(CS-9) — 행 본체(카메라 이동)와 분리된 별도 터치. */}
        {onOpenDetail ? (
          <TouchableOpacity
            style={styles.detailButton}
            onPress={handlePressDetail}
            accessibilityRole='button'
            accessibilityLabel={`${item.name} 상세 보기`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name='chevron-forward'
              size={20}
              color={Color.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PretendardText style={styles.headerTitle} weight='bold'>
          즐겨찾기
        </PretendardText>
        {onClose ? (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole='button'
            accessibilityLabel='닫기'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {spots.length === 0 ? (
        // 로그인했으나 즐겨찾기가 0건일 때의 빈 상태(CS-9).
        <View style={styles.emptyWrap}>
          <PretendardText style={styles.emptyText}>
            아직 즐겨찾기한 박지가 없어요
          </PretendardText>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={spot => spot.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    color: Color.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingVertical: 12,
  },
  detailButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 15,
    color: Color.textPrimary,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  typeBadgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  rowRegion: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
    color: Color.textSecondary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

export default CampSiteFavoritesListView;
