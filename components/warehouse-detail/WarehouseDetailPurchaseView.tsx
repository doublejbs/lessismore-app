import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';

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
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePressPurchase}>
        <PretendardText style={styles.buttonText} weight='semibold'>
          최저가 구입하기
        </PretendardText>
      </TouchableOpacity>
      <PretendardText style={styles.disclaimerText}>
        이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를
        제공받습니다.
      </PretendardText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});

export default observer(WarehouseDetailPurchaseView);
