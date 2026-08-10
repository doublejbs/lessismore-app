import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import LiquidGlassCapsule from '@/components/liquid/LiquidGlassCapsule';
import LiquidGlassCircleButton from '@/components/liquid/LiquidGlassCircleButton';
import { Liquid, LiquidType } from '@/constants/DesignTokens';

interface Props {
  onPressBack: () => void;
  /**
   * 스크롤 게이트로 나타나는 가운데 타이틀(장비 상세 GD-1). 없으면 자리를 비운다 —
   * 최상단에서는 본문 이름이 화면 대상이라 바에 같은 말을 또 두지 않는다.
   */
  title?: string | undefined;
  /**
   * 아이콘 칸들을 담는 유리 캡슐 안 내용. **없으면 캡슐 자체를 그리지 않는다**:
   * 누를 것이 하나도 없는 화면(장비 상세의 커스텀·미보유 장비, 로딩 구간)에서 빈 유리
   * 알약이 남으면 누를 수 없는 유리가 헤더에 떠 있다.
   */
  actions?: ReactNode;
  /**
   * 캡슐이 아닌 우측 노드를 직접 놓을 때(패킹 모드의 텍스트 알약 — 캡슐 **자체가** 버튼이라
   * 아이콘 칸 문법을 쓰지 않는다). `actions`와 함께 쓰지 않는다.
   */
  right?: ReactNode;
}

/**
 * 캡슐 안 아이콘 칸 한 변. 호출부가 액션을 이 칸에 담아야 캡슐 내부 여백·아이콘 중심
 * 간격(34 + gap 2 = 36)이 맞는다.
 *
 * 칸을 캡슐 높이(38)까지 넓히는 히트 여유는 호출부가 붙인다 — `LiquidGlassCapsule`의
 * 겉면이 알약으로 클리핑하므로(`overflow: 'hidden'`) 그 밖으로 나간 히트 영역이 전달되지
 * 않아 아이콘 여러 개를 담는 캡슐에서는 38이 상한이다. 지오메트리가 아니라 현 프리미티브
 * 구조가 정하는 값이다.
 */
export const LIQUID_HEADER_ICON_BOX = 34;

// 아이콘 칸 34 + 캡슐 좌우 5 = 시스템 바 버튼 캡슐과 같은 내부 여백(목업 §6·§8·§9).
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
 * Android·Web용 유리 헤더 크롬 (Liquid Depth, 목업 §6·§7·§8·§9).
 *
 * 좌측 원형 글래스 back + (있으면) 가운데 타이틀 + 우측 유리 캡슐 한 줄을 그린다.
 * 배낭 상세·패킹 모드·창고·장비 상세 헤더가 문자 단위로 같은 구조였어서 이 하나로 모았다.
 *
 * iOS는 네이티브 투명 헤더가 같은 그림(원형 글래스 back + 글래스 바 버튼)을 시스템에서
 * 내주므로 이 컴포넌트를 쓰지 않는다(LG-1) — 두 플랫폼이 같은 그림을 보되 만드는 주체만
 * 다르다. 타이틀도 두 플랫폼이 같은 스크롤 게이트 값을 나눠 쓴다(iOS는 네이티브
 * `headerTitle`에, 여기서는 좌우 크롬 사이 가운데 자리에).
 */
const LiquidHeaderChrome: FC<Props> = ({
  onPressBack,
  title,
  actions,
  right,
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

      {/* 캡슐은 타이틀 뒤에 그린다 — 타이틀이 절대 배치라 겹칠 때 크롬이 위에 남아야 한다. */}
      {actions ? (
        <LiquidGlassCapsule paddingHorizontal={ACTIONS_PAD_H} gap={ACTIONS_GAP}>
          {actions}
        </LiquidGlassCapsule>
      ) : null}

      {right}
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

export default LiquidHeaderChrome;
