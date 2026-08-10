import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';
import Order from '@/model/order/Order';
import OrderOption from '@/model/order/OrderOption';
import { setSortSheetContext } from '@/model/sort/SortSheetHandoff';

interface Props {
  order: Order;
  onSelectOption?: (option: OrderOption) => void;
}

// WH-3 정렬 진입 버튼. 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 공용 formSheet 라우트로 위임한다.
// 시각은 Liquid Depth — 라벨 13.5/600 잉크 + 쉐브론은 한 단계 낮춘 `inkMuted`(목업 §5).
// 피드·탐색의 정렬 드롭다운(FeedFilterBarView)과 같은 문법이다.
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
      {/* 시각 높이는 32지만 실제 터치 영역은 44 — Android는 hitSlop이 부모 경계 밖으로
          못 나가므로 컨테이너를 44로 키우고 음수 마진으로 레이아웃 자리만 32를 유지한다. */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSortClick}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={`정렬: ${selectedOrderName}`}
      >
        <PretendardText weight='semibold' style={styles.buttonText}>
          {selectedOrderName}
        </PretendardText>
        <Ionicons name='chevron-down' size={15} color={Liquid.inkMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    marginVertical: -6,
    justifyContent: 'center',
  },
  button: {
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  buttonText: {
    fontSize: 13.5,
    lineHeight: 18,
    color: Liquid.ink,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default observer(OrderButtonView);
