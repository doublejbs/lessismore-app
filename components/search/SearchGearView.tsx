import { FC, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import GearRowActions from '@/model/browse/GearRowActions';
import Gear from '@/model/gear/Gear';
import {
  formatGearWeightOrNull,
  MISSING_WEIGHT_LABEL,
} from '@/model/gear/WeightFormat';
import Bag from '@/model/bag/Bag';
import LiquidAddCta from '@/components/liquid/LiquidAddCta';
import LiquidMetricRow from '@/components/liquid/LiquidMetricRow';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
} from '@/constants/DesignTokens';
import SearchGearAddToBagModalView from './SearchGearAddToBagModalView';
import app from '@/model/app/App';

interface Props {
  searchWarehouse: GearRowActions;
  gear: Gear;
  bag: Bag;
}

/**
 * SR-7 카테고리·브랜드 목록의 장비 행 (Liquid Depth, 2026-08-11 이식).
 *
 * 창고·인기 순위와 **같은 목록 문법**(`LiquidMetricRow`)을 쓰고, 담기 CTA는 피드·검색
 * 결과와 같은 컴포넌트(`LiquidAddCta`)를 오른쪽 슬롯에 끼운다 — 같은 행을 두 벌 만들면
 * 여백·타이포가 갈린다.
 *
 * **행 하나가 곧 카드다**(패킹 PK-2와 같은 문법). 창고처럼 흰 카드 하나에 행을 쌓지 않는
 * 이유는 이 목록이 무한 스크롤로 자라기 때문이다 — 카드가 리스트 컨테이너와 같아지면
 * 스크롤 프레임 안에 갇혀 마지막 행이 카드 밑단에서 잘린다.
 */
const SearchGearView: FC<Props> = ({ gear, searchWarehouse, bag }) => {
  const isAdded = gear.isAdded();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      const success = await searchWarehouse.registerSingle(gear);

      if (success) {
        app
          .getAnalyticsManager()
          ?.logClick('search_add', { target: 'warehouse' });
        setShowModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      await searchWarehouse.removeSingle(gear);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleGearPress = () => {
    app.getAnalyticsManager()?.logClick('gear_item', { from: 'search' });
    searchWarehouse.goToGearDetail(gear);
  };

  // 색상·사용률을 한 줄로 잇는다(창고 WH-1과 같은 메타 문법) — 값이 없는 조각은 빼서
  // ` · `가 홀로 남지 않게 한다. 색상 표시는 getDisplayColor()로 통일한다(DM-3).
  const meta = [
    gear.getDisplayColor(),
    gear.hasUsedRate() ? `사용률 ${gear.getUsedRate()}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const weight = formatGearWeightOrNull(gear.getWeight());
  const company = gear.getDisplayCompany();

  /**
   * 스크린리더는 행을 한 문장으로 읽는다 — 브랜드는 이름을 여는 라벨이라 쉼표 없이 붙이고,
   * 그 뒤 사실들만 쉼표로 나눈다(창고 목록 행과 같은 처리).
   */
  const getAccessibilityLabel = (): string =>
    [
      [company, gear.getDisplayName()].filter(Boolean).join(' '),
      weight ?? MISSING_WEIGHT_LABEL,
    ]
      .filter(Boolean)
      .join(', ');

  return (
    <>
      <Pressable
        // 누름은 색을 바꾸지 않고 투명도만 낮춘다(핸드오프 인터랙션 규칙).
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={handleGearPress}
        accessibilityRole='button'
        accessibilityLabel={getAccessibilityLabel()}
      >
        <LiquidMetricRow
          name={gear.getDisplayName()}
          // 정체가 두 줄인 행과 세 줄인 행의 키를 같게 묶는다(SR → WH-1 행 높이 계약).
          minContentHeight={LiquidLayout.rowMinContent}
          trailing={
            <LiquidAddCta
              added={isAdded}
              loading={loading}
              onPress={isAdded ? handleRemovePress : handleAddPress}
              // 체크 아이콘만으로는 "누르면 제거"가 드러나지 않는다(SR-4와 같은 처리).
              accessibilityLabel={
                isAdded
                  ? `${gear.getDisplayName()} 창고에서 빼기`
                  : `${gear.getDisplayName()} 창고에 담기`
              }
            />
          }
          value={weight}
          {...(company ? { brand: company } : {})}
          {...(meta ? { meta } : {})}
        />
      </Pressable>

      <SearchGearAddToBagModalView
        visible={showModal}
        onClose={handleCloseModal}
        gear={gear}
        bag={bag}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  cardPressed: {
    opacity: LiquidMotion.pressOpacity,
  },
});

export default observer(SearchGearView);
