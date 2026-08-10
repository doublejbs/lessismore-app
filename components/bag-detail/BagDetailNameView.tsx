import { FC } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import BagTripSection, {
  BAG_TRIP_SECTION_LABEL,
} from '@/model/bag/BagTripSection';
import TripPhase from '@/model/bag/TripPhase';
import { Liquid, LiquidMotion, LiquidRadius } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

/**
 * 타이틀 블록(BD-1) — 상황 알약 + 배낭 이름 라지 타이틀.
 *
 * 알약은 **상태 표시**라 탭 대상이 아니다. 이름 행만 탭하면 배낭 정보 수정
 * formSheet(`/bag-info-edit`)를 연다.
 */
const BagDetailNameView: FC<Props> = ({ bagDetail }) => {
  const handleNamePress = () => {
    bagDetail.openInfoEdit();
  };

  /**
   * `여행 예정 · D-6` 한 덩어리. 구간 이름은 배낭 목록의 섹션 라벨과 **같은 말**을 써야
   * 한 배낭이 목록과 상세에서 다르게 불리지 않는다(핸드오프 카피).
   * `여행 중`·`지난 여행`은 그 자체로 구간이라 상황 라벨만으로 충분하다.
   */
  const getStatusLabel = (): string => {
    const phaseLabel = bagDetail.getPhaseLabel();

    if (bagDetail.getTripPhase() === TripPhase.Before) {
      return `${BAG_TRIP_SECTION_LABEL[BagTripSection.Upcoming]} · ${phaseLabel}`;
    }

    return phaseLabel;
  };

  return (
    <View>
      <View style={styles.statusBadge}>
        <PretendardText weight='semibold' style={styles.statusText}>
          {getStatusLabel()}
        </PretendardText>
      </View>
      <TouchableOpacity
        style={styles.nameContainer}
        onPress={handleNamePress}
        activeOpacity={LiquidMotion.pressOpacity}
        // 한 줄일 때 시각 높이는 38이라 세로 여유로 44pt 터치 타깃을 채운다(기간 행과 같은 방식).
        // 아래 기간 행과 히트 영역이 겹쳐도 두 행이 같은 시트를 열어 결과가 갈리지 않는다.
        hitSlop={{ top: 3, bottom: 3, left: 0, right: 12 }}
        accessibilityRole='button'
        accessibilityLabel='배낭 정보 수정'
      >
        <PretendardText style={styles.nameText} weight='bold' numberOfLines={2}>
          {bagDetail.getName()}
        </PretendardText>
        <Ionicons name='pencil' size={15} color={Liquid.inkSubtle} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 알약이 잘리지 않는다.
  statusBadge: {
    alignSelf: 'flex-start',
    minHeight: 26,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.badgeFill,
  },
  statusText: {
    fontSize: 12,
    color: Liquid.inkSecondary,
  },
  nameContainer: {
    alignSelf: 'flex-start',
    // alignSelf: flex-start면 컨테이너가 콘텐츠 크기로 잡혀 부모 폭을 넘어서고,
    // 그 안에서는 자식이 넘치지 않으니 nameText의 flexShrink가 발동하지 않는다.
    // 폭을 부모로 제한해야 텍스트가 줄어들고 연필이 화면 안에 남는다.
    maxWidth: '100%',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  nameText: {
    fontSize: 30,
    // 2줄까지 늘어나므로 한글 받침이 잘리지 않게 줄 간격을 명시한다.
    lineHeight: 38,
    letterSpacing: -0.9,
    color: Liquid.ink,
    flexShrink: 1,
  },
});

export default observer(BagDetailNameView);
