import { FC } from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  style?: StyleProp<TextStyle>;
}

/**
 * 쿠팡 파트너스 수수료 고지(CP-3, GD-5). 모든 쿠팡 자리의 섹션·카드 바로 아래에 상시 둔다 —
 * 숨김·접힘·스크롤 끝으로 미루기 없음. 문구는 `commerce.coupangDisclaimer` 한 곳에서만 바뀐다.
 */
const CoupangDisclaimerView: FC<Props> = ({ style }) => {
  return (
    <PretendardText style={[styles.text, style]}>
      {app.getL10n().t('commerce.coupangDisclaimer')}
    </PretendardText>
  );
};

const styles = StyleSheet.create({
  // 고지는 조용히 둔다 — 면 밖, 좌측 정렬. 링크보다 시각 위계를 낮춘다.
  text: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default CoupangDisclaimerView;
