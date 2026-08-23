import { FC } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';
import app from '@/model/app/App';

interface Props {
  // 즐겨찾기한 박지 목록(campSiteMap.getFavoriteSpots()). 로드된 활성 박지와 즐겨찾기 id 조인 결과.
  spots: CampSpot[];
  // 항목 탭 — 지도 탭은 카메라 이동, 선택기는 이 박지 선택으로 이어진다(CS-9).

  // 항목 우측 상세 버튼 — 있으면 표시하고 탭 시 박지 상세로 이동한다(지도 탭, CS-9).
  onOpenDetail: (spot: CampSpot) => void;
  // 헤더 닫기 버튼 표시 여부 — 선택기 pageSheet는 넘기고, formSheet 라우트는 그래버로 닫아 생략한다.
  onClose?: () => void;
}

// 즐겨찾기 리스트 시트(CS-9)의 콘텐츠 — 헤더 + 리스트 + 빈 상태. 컨테이너(Modal·formSheet 라우트)는
// 호출자가 감싼다. 지도 탭 formSheet 라우트와 선택기 pageSheet가 이 뷰를 공유한다.
const CampSiteFavoritesListView: FC<Props> = ({
  spots,
  onOpenDetail,
  onClose,
}) => {
  const l10n = app.getL10n();
  const renderItem = ({ item, index }: { item: CampSpot; index: number }) => {
    /**
     * 행 전체가 상세를 연다. 예전에는 행 본체(카메라 이동)와 우측 셰브론(상세)이 다른 일을
     * 하는 두 개의 터치 타깃이었는데, 셰브론 달린 행은 "눌러서 상세로"가 플랫폼 관례라
     * 행을 누른 사용자가 예상과 다른 결과를 얻었다(2026-08-04 UX 리뷰).
     *
     * 카메라 이동 단독 동작은 잃지 않는다 — 상세를 열 때도 같은 좌표로 이동하고, 이 시트는
     * 딤이 없어 뒤 지도가 계속 보인다.
     */
    const handlePress = () => {
      onOpenDetail(item);
    };

    return (
      <TouchableOpacity
        style={[styles.row, index > 0 && styles.rowDivided]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('campSite.favorites.detail', { name: item.name })}
      >
        {/* 목록 행 문법(HM-8): 이름 + 메타 한 줄. 유형·지역을 `·`로 이어 붙여 배지를 없앤다. */}
        <View style={styles.rowMain}>
          <View style={styles.rowText}>
            <PretendardText
              style={styles.rowName}
              weight='medium'
              numberOfLines={2}
            >
              {item.name}
            </PretendardText>
            <PretendardText style={styles.rowMeta} numberOfLines={1}>
              {[getCampSiteTypeLabel(item.type), getCampSpotRegionLabel(item)]
                .filter(Boolean)
                .join(' · ')}
            </PretendardText>
          </View>
        </View>

        {/* 셰브론은 장식이다 — 행 전체가 하나의 터치 타깃이라 별도 버튼으로 두지 않는다. */}
        <View style={styles.detailButton} pointerEvents='none'>
          <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  // 제목 줄은 목록의 헤더로 넣는다. 형제로 두면 시트 안에서 목록이 그 위로 겹쳐 그려져
  // 제목이 행 밑에 깔렸다(2026-08-04 시뮬레이터 확인).
  const header = (
    <View style={styles.header}>
      <PretendardText style={styles.headerTitle} weight='bold'>
        {l10n.t('campSite.favorites.title')}
      </PretendardText>
      {onClose ? (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('campSite.favorites.close')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name='close' size={24} color={Acg.ink} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {spots.length === 0 ? (
        // 로그인했으나 즐겨찾기가 0건일 때의 빈 상태(CS-9).
        <View style={styles.emptyContent}>
          {header}
          <View style={styles.emptyWrap}>
            <PretendardText style={styles.emptyText}>
              {l10n.t('campSite.favorites.empty')}
            </PretendardText>
          </View>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={spot => spot.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

// 네이티브 시트 그래버(약 8pt) 아래 여유. 목록 컨테이너가 이미 8pt를 더하므로
// 제목 위 총 여백은 이 값 + 8이 된다 — 36은 제목이 너무 내려앉았다.
const SHEET_GRABBER_CLEARANCE = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 시트 지면도 순백이다 — 옛 종이 회색(#F4F3EF)은 새 지면과 갈렸다.
    backgroundColor: Acg.paper,
  },
  // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다
  // — 12로는 제목이 그래버에 붙어 위가 답답했다(2026-08-04 사용자 지적).
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 아이콘의 시각 중심을 화면 여백에 맞추려 컨테이너를 바깥으로 당긴다(상세 시트와 동일).
    marginRight: -10,
    paddingTop: SHEET_GRABBER_CLEARANCE,
    paddingBottom: 12,
  },
  // 시트 제목 — 화면 제목과 같은 층이다.
  headerTitle: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // 목록이 없을 때도 헤더와 빈 상태를 목록과 같은 좌우 정렬선에 맞춘다.
  emptyContent: {
    flex: 1,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  // 레퍼런스 목록 행(HM-8) — 면 없이 지면에 놓고 행 사이 헤어라인으로만 가른다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  rowName: {
    ...AcgType.rowTitle,
    flexShrink: 1,
    color: Acg.ink,
  },
  /**
   * 유형·지역은 **배지가 아니라 메타 글자**다(2026-08-12). 면 없이 헤어라인으로만 가르는
   * 목록에서 배지는 유일한 예외 면이 되고, 값 하나 때문에 행마다 작은 사각형이 생긴다.
   */
  rowMeta: {
    ...AcgType.rowSubtitle,
    flexShrink: 1,
    color: Acg.ink,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
    textAlign: 'center',
  },
});

export default observer(CampSiteFavoritesListView);
