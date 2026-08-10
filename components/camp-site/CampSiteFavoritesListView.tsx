import { FC } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import LiquidSheetCloseButton from '@/components/liquid/LiquidSheetCloseButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeColor,
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';

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
  const renderItem = ({ item }: { item: CampSpot }) => {
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
        style={styles.row}
        onPress={handlePress}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={`${item.name} 상세 보기`}
      >
        {/* 지도 마커와 같은 유형색 원 — 목록에서 고른 것이 지도에서 어떤 마커인지 색으로 잇는다. */}
        <View
          style={[
            styles.typeMark,
            { backgroundColor: getCampSiteTypeColor(item.type) },
          ]}
        />

        <View style={styles.rowTexts}>
          <PretendardText
            style={styles.rowName}
            weight='semibold'
            numberOfLines={1}
          >
            {item.name}
          </PretendardText>
          <PretendardText style={styles.rowMeta} numberOfLines={1}>
            {`${getCampSiteTypeLabel(item.type)} · ${getCampSpotRegionLabel(item)}`}
          </PretendardText>
        </View>

        {/* 셰브론은 장식이다 — 행 전체가 하나의 터치 타깃이라 별도 버튼으로 두지 않는다. */}
        <Ionicons
          name='chevron-forward'
          size={18}
          color={Liquid.inkSubtle}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  // 제목 줄은 목록의 헤더로 넣는다. 형제로 두면 시트 안에서 목록이 그 위로 겹쳐 그려져
  // 제목이 행 밑에 깔렸다(2026-08-04 시뮬레이터 확인).
  const header = (
    <View style={styles.header}>
      <PretendardText style={styles.headerTitle} weight='bold'>
        즐겨찾기
      </PretendardText>
      {onClose ? <LiquidSheetCloseButton onPress={onClose} /> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {spots.length === 0 ? (
        // 로그인했으나 즐겨찾기가 0건일 때의 빈 상태(CS-9) — 사실 + 다음 걸음 두 줄.
        <>
          <View style={styles.emptyHeader}>{header}</View>
          <View style={styles.emptyWrap}>
            <PretendardText style={styles.emptyTitle} weight='semibold'>
              아직 즐겨찾기한 박지가 없어요
            </PretendardText>
            <PretendardText style={styles.emptyHint}>
              지도에서 마음에 든 곳의 별을 눌러 모아 둘까요?
            </PretendardText>
          </View>
        </>
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
  // 시트 지면. 네이티브 시트가 상단 모서리와 그림자를 그리고, 이 면이 그 안을 채운다.
  container: {
    flex: 1,
    backgroundColor: Liquid.canvas,
  },
  // 네이티브 그래버가 시트 상단에 겹쳐 렌더되므로 그 아래로 제목이 오도록 여백을 준다
  // — 12로는 제목이 그래버에 붙어 위가 답답했다(2026-08-04 사용자 지적).
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: SHEET_GRABBER_CLEARANCE,
    paddingBottom: 12,
  },
  // 빈 상태에서는 헤더가 리스트 밖에 놓여 좌우 축(과 목록 컨테이너가 더하던 상단 8)을
  // 스스로 잡아야 한다 — 두 상태에서 제목 높이가 갈리면 시트가 열릴 때 제목이 튄다.
  emptyHeader: {
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  listContent: {
    paddingHorizontal: LiquidLayout.screenH,
    // 상단 8은 헤더 주석이 전제하는 값이다 — 그래버 여유(12)만으로는 제목이 그래버에 붙는다.
    paddingVertical: 8,
    gap: LiquidLayout.listGap,
  },
  // 지면 위 흰 카드 행 — 구분선 대신 카드 사이 간격이 행을 가른다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingVertical: 14,
    paddingHorizontal: LiquidLayout.cardPad,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  typeMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    color: Liquid.ink,
  },
  rowMeta: {
    fontSize: 12.5,
    color: Liquid.inkMuted,
  },
  chevron: {
    marginRight: -4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
    // 헤더 높이만큼 위로 치우친 중심을 되돌린다.
    paddingBottom: 48,
  },
  emptyTitle: {
    fontSize: 15,
    color: Liquid.ink,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
    textAlign: 'center',
  },
});

export default CampSiteFavoritesListView;
