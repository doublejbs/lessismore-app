import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';

interface Props {
  onPressNotification: () => void;
  onPressContact: () => void;
  onPressPrivacy: () => void;
  onPressTerms: () => void;
}

interface MenuRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

/**
 * AU-4 정보 탭 메뉴 (Liquid Depth).
 *
 * **네 줄이 흰 카드 하나**이고 행은 좌우 16 들여쓴 헤어라인으로만 갈린다(목업 §11) —
 * 행마다 면을 두면 목록이 카드 더미로 보인다.
 */
const InfoMenuCardView: FC<Props> = ({
  onPressNotification,
  onPressContact,
  onPressPrivacy,
  onPressTerms,
}) => {
  const rows: MenuRow[] = [
    {
      icon: 'notifications-outline',
      label: '알림 설정',
      onPress: onPressNotification,
    },
    {
      icon: 'chatbubble-ellipses-outline',
      label: '서비스 문의',
      onPress: onPressContact,
    },
    {
      icon: 'shield-checkmark-outline',
      label: '개인정보 처리방침',
      onPress: onPressPrivacy,
    },
    {
      icon: 'document-text-outline',
      label: '이용약관',
      onPress: onPressTerms,
    },
  ];

  return (
    // 그림자는 껍데기가 들고 클리핑은 안쪽이 맡는다 — 한 뷰에 겹치면 그림자가 잘린다.
    <View style={styles.shell}>
      <View style={styles.clip}>
        {rows.map((row, index) => (
          <View key={row.label}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <TouchableOpacity
              style={styles.row}
              onPress={row.onPress}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel={row.label}
            >
              <Ionicons
                name={row.icon}
                size={20}
                color={Liquid.inkSecondary}
                accessible={false}
              />
              <PretendardText weight='medium' style={styles.label}>
                {row.label}
              </PretendardText>
              <Ionicons
                name='chevron-forward'
                size={15}
                color={Liquid.inkSubtle}
                accessible={false}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
  },
  clip: {
    borderRadius: LiquidRadius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: LiquidLayout.cardPad,
    // 고정 높이를 주지 않는다 — Dynamic Type에서 라벨이 잘린다.
    minHeight: LiquidLayout.touchMin,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: Liquid.ink,
  },
  /**
   * 들여쓰기는 **좌우 같은 값**(카드 여백 16)이다.
   *
   * 예전에는 좌측만 48(아이콘 20 + 간격 12 + 여백 16) 들여써 선이 라벨 시작선에서
   * 출발했는데, 오른쪽이 카드 엣지까지 흐르니 카드 모서리와 만나는 지점이 좌우로 달라
   * 선이 기울어 보였다(2026-08-11 디자인 리뷰). 카드 안 헤어라인은 좌우 대칭이 기준이다
   * (`LiquidMetricRow`의 divider와 같은 판단).
   */
  divider: {
    height: 0.5,
    marginHorizontal: LiquidLayout.cardPad,
    backgroundColor: Liquid.hairline,
  },
});

export default InfoMenuCardView;
