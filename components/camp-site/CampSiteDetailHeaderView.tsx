import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  name: string;
  typeLabel: string;
  region: string;
  // 위치로 이동(CS-2) — 지도에서 연 시트에만 있다(공유 딥링크 진입엔 되돌릴 지도가 없어 undefined).
  onPressMoveToSpot?: (() => void) | undefined;
  onPressShare: () => void;
  onPressNaverMap: () => void;
  onPressClose: () => void;
}

// 아이콘 버튼은 시각 폭을 44보다 좁혀 이름이 쓸 폭을 확보하고(60% 시트라 가로가 귀하다),
// 부족한 만큼은 hitSlop으로 메워 44pt 터치 타깃(HIG)을 유지한다.
const ICON_BUTTON_WIDTH = 36;
const ICON_HIT_SLOP = { top: 0, bottom: 0, left: 4, right: 4 };

// 박지 상세 시트의 고정 헤더(CS-3) — ① 이름 + 액션 아이콘 한 줄 ② 유형 배지 · 지역.
// 아이콘만 따로 한 줄을 쓰면 가운데가 비어 세로를 낭비하므로 이름과 같은 줄에 둔다(구글 지도 장소 시트).
const CampSiteDetailHeaderView: FC<Props> = ({
  name,
  typeLabel,
  region,
  onPressMoveToSpot,
  onPressShare,
  onPressNaverMap,
  onPressClose,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <PretendardText
          style={styles.name}
          weight='bold'
          numberOfLines={1}
          ellipsizeMode='tail'
        >
          {name}
        </PretendardText>

        {/* 헤더 우측 액션 — (지도 진입 시) 위치로 이동 + 공유 + 네이버 지도 + 닫기(CS-2/CS-3/CS-7) */}
        <View style={styles.actionRow}>
          {onPressMoveToSpot ? (
            <TouchableOpacity
              onPress={onPressMoveToSpot}
              style={styles.iconButton}
              hitSlop={ICON_HIT_SLOP}
              accessibilityLabel='지도에서 이 박지 위치로 이동'
              accessibilityRole='button'
            >
              <Ionicons name='locate' size={22} color={Color.textPrimary} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onPressShare}
            style={styles.iconButton}
            hitSlop={ICON_HIT_SLOP}
            accessibilityLabel='공유'
            accessibilityRole='button'
          >
            <Ionicons name='share-outline' size={22} color={Color.textPrimary} />
          </TouchableOpacity>
          {/* 외부 길찾기 성격이라 조준 아이콘(위치로 이동)과 구분되는 방향 화살표를 쓴다(CS-3). */}
          <TouchableOpacity
            onPress={onPressNaverMap}
            style={styles.iconButton}
            hitSlop={ICON_HIT_SLOP}
            accessibilityLabel='네이버 지도에서 열기'
            accessibilityRole='button'
          >
            <Ionicons
              name='navigate-outline'
              size={22}
              color={Color.textPrimary}
            />
          </TouchableOpacity>
          {/* 상세는 지도 위 바텀 시트(CS-2)라 뒤로 가기가 아니라 닫기(X)를 둔다. */}
          <TouchableOpacity
            onPress={onPressClose}
            style={styles.iconButton}
            hitSlop={ICON_HIT_SLOP}
            accessibilityLabel='닫기'
            accessibilityRole='button'
          >
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.typeBadge}>
          <PretendardText style={styles.typeBadgeText} weight='semibold'>
            {typeLabel}
          </PretendardText>
        </View>
        <PretendardText style={styles.region} numberOfLines={1}>
          {region}
        </PretendardText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    // 시트 상단엔 네이티브 그래버가 그려진다 — 여유를 안 주면 제목이 그래버에 붙는다.
    paddingTop: 14,
    paddingBottom: 10,
    // 이름·배지·지역은 한 덩어리라 좁게 묶는다(아래 탭 바와의 간격이 그룹 경계가 된다).
    gap: 2,
    backgroundColor: Color.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    color: Color.textPrimary,
  },
  // 마지막 아이콘의 시각 중심을 화면 여백에 맞추려 컨테이너를 바깥으로 당긴다.
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  iconButton: {
    width: ICON_BUTTON_WIDTH,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: Color.chipInactiveBg,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  region: {
    flexShrink: 1,
    fontSize: 14,
    color: Color.textSecondary,
  },
});

export default CampSiteDetailHeaderView;
