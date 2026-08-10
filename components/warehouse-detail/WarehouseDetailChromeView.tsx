import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '../PretendardText';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { Liquid, LiquidType } from '@/constants/DesignTokens';

interface Props {
  onPressBack: () => void;
  /**
   * 공유·수정 — 유리 캡슐 안에 나란히 앉는다. **없으면 캡슐 자체를 그리지 않는다**:
   * 커스텀·미보유 장비는 두 액션이 다 빠지는데(GD-1·GD-7) 그때 빈 유리 알약이 남으면
   * 누를 수 없는 유리가 헤더에 떠 있다. 로딩 구간(장비를 아직 모른다)도 같은 경우다.
   */
  actions?: ReactNode;
  /** 스크롤이 정체 블록을 지나면 나타나는 제품명(GD-1). 없으면 자리를 비운다 */
  title?: string | undefined;
}

/** 캡슐 안 아이콘 칸 한 변. 호출부가 액션을 이 칸에 담아야 캡슐 내부 여백이 맞는다. */
export const HEADER_ICON_BOX = 34;

// 아이콘 칸 34 + 캡슐 좌우 5 = 시스템 바 버튼 캡슐과 같은 내부 여백(목업 §6·§9).
const ACTIONS_PAD_H = 5;
const ACTIONS_GAP = 2;
/**
 * 좌우 크롬과 겹치지 않게 타이틀이 비켜 앉는 인셋. 넓은 쪽(우측 액션 캡슐)에 맞춘다 —
 * 양쪽 같은 값이라야 타이틀이 화면 가운데에 남는다.
 *
 * 캡슐 실측 ≈90 = 좌우 여백 5×2 + 공유 칸 34 + gap 2 + `수정` 알약 ≈44(글자 14 + 좌우 8×2).
 * 여기에 겹침 여유 12를 더한 값이다. 좌측 원(38)보다 넉넉하지만, 타이틀은 1줄 말줄임이라
 * 가운데 정렬이 흔들리는 쪽이 더 눈에 띈다.
 */
const TITLE_INSET = 102;

/**
 * Android·Web용 장비 상세 헤더 크롬 (Liquid Depth, 목업 §9).
 *
 * iOS는 네이티브 투명 헤더가 같은 그림(원형 글래스 back + 글래스 바 버튼)을 시스템에서
 * 내주므로 이 컴포넌트를 쓰지 않는다(LG-1) — 두 플랫폼이 같은 그림을 보되 만드는 주체만 다르다.
 * 타이틀도 두 플랫폼이 같은 스크롤 게이트를 쓴다(최상단에서는 비고, 정체 블록을 지나면 나타난다 —
 * GD-1) — iOS는 그 값을 네이티브 `headerTitle`에 넣고, 여기서는 캡슐 사이 가운데 자리에 그린다.
 */
const WarehouseDetailChromeView: FC<Props> = ({
  onPressBack,
  actions,
  title,
}) => {
  return (
    <View style={styles.header}>
      <LiquidGlassCircleButton
        icon='chevron-back'
        onPress={onPressBack}
        accessibilityLabel='뒤로가기'
      />

      {title ? (
        <View style={styles.titleContainer} pointerEvents='none'>
          <PretendardText
            weight='semibold'
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </PretendardText>
        </View>
      ) : null}

      {actions ? (
        <LiquidGlassCapsule paddingHorizontal={ACTIONS_PAD_H} gap={ACTIONS_GAP}>
          {actions}
        </LiquidGlassCapsule>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  // 좌/우 크롬 사이 가운데 영역만 차지한다 — 흐름에 끼우면 캡슐이 밀린다.
  titleContainer: {
    position: 'absolute',
    left: TITLE_INSET,
    right: TITLE_INSET,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
});

export default WarehouseDetailChromeView;
