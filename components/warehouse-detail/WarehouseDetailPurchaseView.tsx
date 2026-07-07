import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import SeperaterView from '../ui/SeperaterView';
import { Color } from '@/constants/DesignTokens';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailPurchaseView: FC<Props> = ({ warehouseDetail }) => {
  const coupangUrl = warehouseDetail.getCoupangUrl();

  const handlePressPurchase = () => {
    warehouseDetail.openCoupangUrl();
  };

  if (!coupangUrl) {
    return null;
  }

  return (
    <>
      <SeperaterView />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.link}
          onPress={handlePressPurchase}
          activeOpacity={0.6}
        >
          <PretendardText style={styles.linkText}>
            쿠팡에서 최저가 보기
          </PretendardText>
          <Ionicons name='chevron-forward' size={14} color={Color.textTertiary} />
        </TouchableOpacity>
        <PretendardText style={styles.disclaimerText}>
          이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
          제공받습니다.
        </PretendardText>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    color: Color.textTertiary,
  },
  disclaimerText: {
    fontSize: 11,
    color: Color.textSecondary,
    textAlign: 'center',
  },
});

export default observer(WarehouseDetailPurchaseView);
