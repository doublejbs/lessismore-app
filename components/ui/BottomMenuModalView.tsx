import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FC } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LiquidSheetModal from '@/components/liquid/LiquidSheetModal';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';

interface MenuItem {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
  readonly onPress: () => void;
}

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly menuItems: MenuItem[];
}

/**
 * 항목 하나에 딸린 액션(수정·삭제)을 담는 바텀 메뉴 시트 (Liquid Depth, 2026-08-11 이식).
 *
 * 장비 리뷰(RP-4)·박지 후기(CS-8)·장비 상세가 공유한다. **지면(canvas) 위 종이 카드** 문법이다 —
 * 액션 목록이 흰 카드 하나이고 행은 헤어라인으로만 갈린다(창고 목록과 같은 처리).
 *
 * `닫기`는 흰 아웃라인 알약이다 — 잉크로 채우면 이 시트에서 가장 무거운 버튼이 "아무것도
 * 하지 않는" 쪽이 되어, 정작 고르러 온 수정·삭제와 시선을 다툰다.
 *
 * 막·슬라이드는 `LiquidSheetModal`이 든다. 여기에 있던 fade/slide 로직은 `visible`이 꺼지는
 * 순간 Modal이 언마운트돼 **닫힘 애니메이션이 재생되지 않았다** — 프리미티브가 마운트를
 * 붙잡아 이제 실제로 내려간다.
 */
const BottomMenuModalView: FC<Props> = ({ visible, onClose, menuItems }) => {
  const insets = useSafeAreaInsets();

  return (
    <LiquidSheetModal
      visible={visible}
      onRequestClose={onClose}
      closeAccessibilityLabel='닫기'
    >
      <View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
      >
        {/* 행이 자기 여백을 들고 있어 카드 패딩은 0이다. `clip`으로 첫·마지막 행이
            카드 모서리 밖으로 새지 않게 한다. */}
        <LiquidCard tone='paper' padding={0} clip>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.text}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel={item.text}
            >
              {index > 0 ? <View style={styles.divider} /> : null}
              <Ionicons
                name={item.icon}
                size={20}
                color={Liquid.inkSecondary}
              />
              <PretendardText weight='medium' style={styles.menuItemText}>
                {item.text}
              </PretendardText>
            </TouchableOpacity>
          ))}
        </LiquidCard>

        <LiquidPillButton
          label='닫기'
          variant='secondary'
          block
          onPress={onClose}
          style={styles.closeButton}
        />
      </View>
    </LiquidSheetModal>
  );
};

const styles = StyleSheet.create({
  // 화면 폭을 꽉 채운 채 아래가 잘린 면이라 시트 모서리는 `sheetLg`다(로그인 시트와 같은 자리).
  sheet: {
    backgroundColor: Liquid.canvas,
    borderTopLeftRadius: LiquidRadius.sheetLg,
    borderTopRightRadius: LiquidRadius.sheetLg,
    paddingTop: 20,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // 고정 높이 대신 minHeight로 HIG 44pt를 채운다.
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: LiquidLayout.touchMin,
    paddingVertical: 14,
    paddingHorizontal: LiquidLayout.cardPad,
  },
  // 행 위 헤어라인(좌측 16 들여쓰기) — 카드 안에서는 면이 아니라 선이 구획을 맡는다.
  divider: {
    position: 'absolute',
    top: 0,
    left: LiquidLayout.cardPad,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  menuItemText: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  closeButton: {
    marginTop: LiquidLayout.listGap,
  },
});

export default BottomMenuModalView;
