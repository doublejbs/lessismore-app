import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color } from '@/constants/DesignTokens';
import Order from '@/model/order/Order';
import OrderOption from '@/model/order/OrderOption';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';
import app from '@/model/app/App';

interface Props {
  order: Order;
  onSelectOption?: (option: OrderOption) => void;
}

const DownArrowIcon = () => (
  <Svg width={25} height={24} viewBox='0 0 25 24' fill='none'>
    <Path
      d='M7.5 10L12.5008 14.58L17.5 10'
      stroke={Color.textPrimary}
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);

// WH-3 정렬 진입 버튼. 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 공용 formSheet 라우트로 위임한다.
const OrderButtonView = ({ order, onSelectOption }: Props) => {
  const router = useRouter();
  const selectedOrderName = order.getSelectedOrderName();

  const handleSortClick = () => {
    const options = order.mapOrderOptions(option => option);

    setSortSheetContext({
      options: options.map(option => ({
        key: option.getOrder(),
        label: option.getName(),
      })),
      selectedKey: order.getSelectedOrderType() ?? '',
      onSelect: key => {
        const option = options.find(item => item.getOrder() === key);

        if (option) {
          onSelectOption?.(option);
          order.setOrderOption(option);
        }
      },
    });
    router.push('/sort-sheet');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSortClick}
        hitSlop={8}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('app.order.accessibility', { name: selectedOrderName })}
      >
        <PretendardText weight='semibold' style={styles.buttonText}>
          {selectedOrderName}
        </PretendardText>
        <DownArrowIcon />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 32,
  },
  button: {
    // 높이 100%는 부모가 고정 높이일 때만 성립했다 — 이제 라벨 줄박스 + 세로 패딩이 높이를 정한다.
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...AcgType.control,
    color: Color.textPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default observer(OrderButtonView);
