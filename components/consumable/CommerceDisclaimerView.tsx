import { FC } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import ConsumableMerchant from '@/model/consumable/ConsumableMerchant';
import {
  COMMERCE_DISCLAIMER_KEY,
  getDistinctMerchants,
} from '@/model/consumable/ConsumableMerchantText';
import app from '@/model/app/App';

interface Props {
  // 이 자리에 실제로 보이는 상품의 쇼핑몰(중복 허용). 쇼핑몰마다 고지 한 줄씩.
  merchants: ConsumableMerchant[];
  style?: StyleProp<ViewStyle>;
}

/**
 * 제휴 수수료 고지(CP-3, GD-5). 커머스 자리의 섹션·카드 바로 아래에 상시 둔다 —
 * 숨김·접힘·스크롤 끝으로 미루기 없음. 쿠팡 상품이 있으면 쿠팡 파트너스 고지,
 * 네이버 상품이 있으면 네이버 쇼핑 커넥트 고지, 둘 다면 두 줄이다.
 * 문구는 `commerce.*Disclaimer` 한 곳에서만 바뀐다.
 */
const CommerceDisclaimerView: FC<Props> = ({ merchants, style }) => {
  const distinctMerchants = getDistinctMerchants(merchants);

  if (distinctMerchants.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {distinctMerchants.map(merchant => (
        <PretendardText key={merchant} style={styles.text}>
          {app.getL10n().t(COMMERCE_DISCLAIMER_KEY[merchant])}
        </PretendardText>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  // 고지는 조용히 둔다 — 면 밖, 좌측 정렬. 링크보다 시각 위계를 낮춘다.
  text: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default CommerceDisclaimerView;
