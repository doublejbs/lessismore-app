import { FC } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import {
  Liquid,
  LiquidLayout,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

// 태그 칩만 알약에 가깝게 깎는다(h28) — 나머지 막대는 공용 기본값 4를 쓴다.
const TAG_CHIP_RADIUS = 14;
// iOS는 투명 네이티브 헤더가 상단을 덮으므로 그 높이를 직접 비운다(본 화면과 같은 처리).
const IS_IOS = Platform.OS === 'ios';
/**
 * 정체 블록 위 여백. 본 화면에서는 **콘텐츠 첫 블록**(`WarehouseDetailInformationView`의
 * `paddingTop: 14`)이 들고, 그 값은 iOS 헤더 인셋 **위에** 더해진다(스크롤 컨테이너가
 * `insets.top + navBar`를 비우고 그 안에서 다시 14). 스켈레톤도 같은 식으로 더해야 로드 직후
 * 정체 블록이 14pt 튀지 않는다 — 인셋으로 덮어 쓰면 스켈레톤만 14 위에 붙는다.
 */
const CONTENT_PAD_TOP = 14;

/**
 * GD-1 장비 상세 스켈레톤 (Liquid Depth).
 *
 * 도착할 화면(정체 블록 → 지표 타일 → 스펙 카드)과 **같은 골격**이라야 로드 후 자리가
 * 튀지 않는다 — 좌우 정렬선·섹션 여백·카드 모서리를 본 화면과 같은 토큰으로 둔다.
 * 하단 CTA는 그리지 않는다: 보유 여부를 아직 몰라 버튼이 있을지부터 정해지지 않았다.
 */
const WarehouseDetailSkeletonView: FC = () => {
  // 셔머는 기본값(1 ↔ 0.5 / 반 주기 600ms = 왕복 1.2s)을 그대로 쓴다.
  const opacity = useLiquidShimmer();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        IS_IOS
          ? {
              paddingTop: insets.top + LiquidLayout.navBar + CONTENT_PAD_TOP,
            }
          : null,
      ]}
    >
      {/* 정체 블록 — 브랜드(13) → 이름(28) → 태그 칩 줄 + 우측 무게(42) */}
      <View style={styles.identity}>
        <LiquidSkeletonBar opacity={opacity} width={96} height={14} />
        <LiquidSkeletonBar opacity={opacity} width='72%' height={30} />
        <View style={styles.metaRow}>
          <View style={styles.tags}>
            <LiquidSkeletonBar
              opacity={opacity}
              width={72}
              height={28}
              radius={TAG_CHIP_RADIUS}
            />
            <LiquidSkeletonBar
              opacity={opacity}
              width={72}
              height={28}
              radius={TAG_CHIP_RADIUS}
            />
          </View>
          <LiquidSkeletonBar opacity={opacity} width={88} height={34} />
        </View>
      </View>

      {/* 섹션 하나 — 라벨 + 카드 */}
      <View style={styles.section}>
        <LiquidSkeletonBar
          opacity={opacity}
          width={64}
          height={11}
          style={styles.sectionLabel}
        />
        <View style={styles.cardShell}>
          <View style={styles.cardClip}>
            {[0, 1, 2].map(index => (
              <View key={index} style={styles.specRow}>
                <LiquidSkeletonBar opacity={opacity} width={96} height={14} />
                <LiquidSkeletonBar
                  opacity={opacity}
                  height={14}
                  style={styles.specValue}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 래퍼의 LiquidBackdrop이 깐다.
    backgroundColor: 'transparent',
    // Android·Web은 유리 크롬이 흐름에 앉아 있어 이 값만으로 본 화면과 같은 여백이 된다.
    paddingTop: CONTENT_PAD_TOP,
  },
  identity: {
    paddingHorizontal: LiquidLayout.screenH,
    gap: 8,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  section: {
    marginTop: 24,
    marginHorizontal: LiquidLayout.screenH,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  // 그림자는 껍데기가 든다 — 안쪽에서 모서리를 깎으므로 같은 뷰에 그림자를 걸면 잘린다.
  cardShell: {
    borderRadius: LiquidRadius.card,
    boxShadow: LiquidShadow.card,
  },
  cardClip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
    backgroundColor: Liquid.surface,
    paddingHorizontal: LiquidLayout.cardPad,
    paddingVertical: 4,
  },
  // 실제 스펙 행(paddingVertical 13 · gap 12 · 라벨 96)과 같은 리듬.
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  // 값 막대는 라벨이 가져간 폭의 나머지를 채운다.
  specValue: {
    flex: 1,
  },
});

export default WarehouseDetailSkeletonView;
