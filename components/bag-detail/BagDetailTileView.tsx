import { ComponentProps, FC, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  /**
   * 상황형 강조 타일(BD-10). 잉크 면 + 라임 아이콘으로 뒤집는다 —
   * **그리드에서 한 장만** 켠다(목업 §6: 첫 타일만 잉크).
   */
  emphasized?: boolean;
  /**
   * 그리드 열 수(BD-10). 타일이 3장뿐이면 2열 격자에 빈 칸이 하나 남으므로 **한 줄 3열**로
   * 눌러, 그 아래 `담긴 장비` 목록이 첫 화면에 올라오게 한다(2026-08-11 개정).
   * 3열은 칸이 좁아 부제를 두 줄까지 흘린다.
   */
  columns?: 2 | 3;
  title?: string;
  subtitle?: string | null;
  /** title/subtitle 대신 본문을 직접 그릴 때(메모 내용·줄어든 무게) */
  children?: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}

/**
 * BD-10 액션 그리드 타일의 공통 껍데기 (Liquid Depth).
 *
 * 여행지·메모·사용 기록·운동 기록 네 타일이 같은 면·모서리·여백을 쓰므로 한 곳에 둔다 —
 * 네 파일에 흩어져 있던 값이 화면 안에서 갈리던 자리다.
 * 아이콘은 위, 텍스트 블록은 아래에 붙어 타일 높이가 달라도 글이 같은 선에서 시작한다.
 */
const BagDetailTileView: FC<Props> = ({
  icon,
  emphasized = false,
  columns = 2,
  title,
  subtitle,
  children,
  onPress,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.tile,
        columns === 3 ? styles.tileThird : styles.tileHalf,
        emphasized ? styles.tileInk : styles.tilePaper,
      ]}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name={icon}
        size={21}
        color={emphasized ? Liquid.lime : Liquid.ink}
      />
      <View>
        {title !== undefined ? (
          <PretendardText
            weight='semibold'
            style={[styles.title, emphasized && styles.titleOnInk]}
            numberOfLines={1}
          >
            {title}
          </PretendardText>
        ) : null}
        {subtitle ? (
          <PretendardText
            style={[styles.subtitle, emphasized && styles.subtitleOnInk]}
            numberOfLines={columns === 3 ? 2 : 1}
          >
            {subtitle}
          </PretendardText>
        ) : null}
        {children}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 폭은 %로 둔다 — 타일 개수가 3~4개로 갈리므로(운동 기록은 렌더되지 않을 수 있다)
  // 고정 폭이면 마지막 줄에서 화면 좌우 여백이 어긋난다.
  tile: {
    minHeight: 96,
    borderRadius: LiquidRadius.card,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  tileHalf: {
    width: '48%',
  },
  // 남는 4.5%가 칸 사이 두 틈(≈10)이 된다 — 카드 사이 간격 토큰과 같은 값이다.
  tileThird: {
    width: '31.5%',
  },
  tilePaper: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  // 잉크 타일은 그림자를 두지 않는다(목업 §6 — shadow tile은 흰 타일만). 잉크 면 자체가
  // 지면보다 훨씬 어두워 이미 앞으로 나와 읽히고, 그림자를 더하면 CTA와 무게가 같아진다.
  tileInk: {
    backgroundColor: Liquid.ink,
  },
  title: {
    fontSize: 14.5,
    lineHeight: 20,
    color: Liquid.ink,
  },
  titleOnInk: {
    color: Liquid.surface,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: Liquid.inkMuted,
  },
  subtitleOnInk: {
    color: Liquid.inkOnQuiet,
  },
});

export default BagDetailTileView;
