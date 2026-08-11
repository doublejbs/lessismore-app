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
  /**
   * 칩 면을 깔아 **누를 수 있음**을 드러낸다(WH-3, 2026-08-11 디자인 리뷰).
   *
   * 기본(글자 + 쉐브론만)은 목록 카드 바로 위 필터 줄에 앉아 주변 컨트롤이 문맥을 주는
   * 자리용이다 — 창고처럼 요약 줄 끝에 홀로 뜨면 라벨이 상태 텍스트로 읽혀 탭할 생각을
   * 못 한다. 옵셔널로 둬서 기본값은 기존 소비처(배낭 목록 BAG-1·배낭 편집 BD-4)와 같다.
   */
  chip?: boolean;
}

// 칩 면의 시각 높이 — 컨테이너(44)가 터치를, 이 면이 시각 자리를 맡는다.
const CHIP_HEIGHT = 32;

// WH-3 정렬 진입 버튼. 옵션·현재값·선택 콜백을 모듈 핸드오프에 넣고 공용 formSheet 라우트로 위임한다.
// 시각은 Liquid Depth — 라벨 13.5/600 잉크 + 쉐브론은 한 단계 낮춘 `inkMuted`(목업 §5).
// 피드·탐색의 정렬 드롭다운(FeedFilterBarView)과 같은 문법이다.
const OrderButtonView = ({ order, onSelectOption, chip = false }: Props) => {
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
        {/* 라벨과 쉐브론은 한 덩어리로 묶는다 — 칩 면은 이 덩어리에만 깔려 터치 영역(44)이
            면보다 커도 눌리는 자리가 그대로 유지된다. */}
        <View style={[styles.labelGroup, chip && styles.chipSurface]}>
          <PretendardText weight='semibold' style={styles.buttonText}>
            {selectedOrderName}
          </PretendardText>
          <Ionicons name='chevron-down' size={15} color={Liquid.inkMuted} />
        </View>
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
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  // 비선택 칩과 같은 면·테두리다(`LiquidChip` 유휴 상태) — 정렬은 고르는 값이라 필터 칩과
  // 같은 문법으로 읽혀야 한다. 완전한 알약이라 각진 면이 생기지 않는다.
  chipSurface: {
    minHeight: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    paddingHorizontal: 13,
    backgroundColor: Liquid.chipFill,
    borderWidth: 0.5,
    borderColor: Liquid.chipStroke,
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
