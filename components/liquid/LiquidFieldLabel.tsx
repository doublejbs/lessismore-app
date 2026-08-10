import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidSemantic, LiquidType } from '@/constants/DesignTokens';

interface Props {
  children: string;
  /** 필수 입력 표식(`*`)을 라벨 **바로 뒤**에 붙인다 */
  required?: boolean;
}

/**
 * 폼 입력 필드의 라벨.
 *
 * **섹션 머리 라벨(`LiquidSectionLabel`)과 갈라 둔다** — 섹션 라벨은 대문자 + 0.16em 자간의
 * 마이크로 라벨(11/`inkMuted`)이라 세 가지가 어긋난다:
 * ① `toUpperCase()`가 `무게(g)`를 `무게(G)`로 깨뜨린다(단위 g는 대문자가 없다)
 * ② `trailing`이 `space-between`으로 밀려 필수 표식(`*`)이 화면 우측 끝에 떨어져 앉는다
 * ③ 11px `inkMuted`(3.9:1)는 12px 이상 보조용인데, 입력을 식별하는 **유일한** 라벨이라
 *    보조가 아니다 — 12.5/`inkTertiary`(4.9:1)로 올려 AA를 넘긴다.
 *
 * 대문자로 바꾸지 않고, 표식은 라벨 뒤 4px에 붙인다(자간이 밀지 않는다).
 */
const LiquidFieldLabel: FC<Props> = ({ children, required = false }) => {
  return (
    <View style={styles.row}>
      <PretendardText weight='semibold' style={styles.label}>
        {children}
      </PretendardText>
      {required ? (
        // 필수 표식은 의미색 — 리디자인해도 바꾸지 않는다.
        <PretendardText weight='semibold' style={styles.required}>
          *
        </PretendardText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 아래 여백 10은 섹션 라벨과 같다 — 폼 안에서 라벨·필드 간격이 갈리지 않는다.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  label: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkTertiary,
  },
  required: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: LiquidSemantic.danger,
  },
});

export default LiquidFieldLabel;
