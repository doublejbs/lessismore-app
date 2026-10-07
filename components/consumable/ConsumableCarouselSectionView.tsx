import { FC } from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import { AcgLayout } from '@/constants/DesignTokens';
import ConsumableCardVariant from '@/model/consumable/ConsumableCardVariant';
import { ConsumableProduct } from '@/model/consumable/ConsumableProduct';
import { CONSUMABLE_CAROUSEL_MAX } from '@/model/consumable/ConsumableSlotConstants';
import ConsumableCardView, { CONSUMABLE_CARD_WIDTH } from './ConsumableCardView';
import CoupangDisclaimerView from './CoupangDisclaimerView';

interface Props {
  title: string;
  products: ConsumableProduct[];
  // 애널리틱스 `source`(AN-3): 'home' | 'bag_detail'
  source: string;
}

const CARD_GAP = 10;

/**
 * 소모품 캐러셀 섹션(CP-4·CP-5). 여럿을 훑는 진열대라 카드 두세 장이 한 번에 보이고,
 * 손을 떼면 카드 단위로 멈춘다. 페이지 인디케이터는 두지 않는다.
 *
 * 항목이 0개면 섹션 머리·고지까지 아예 그리지 않는다(CP-1).
 */
const ConsumableCarouselSectionView: FC<Props> = ({ title, products, source }) => {
  if (products.length === 0) {
    return null;
  }

  const visibleProducts = products.slice(0, CONSUMABLE_CAROUSEL_MAX);

  const renderItem: ListRenderItem<ConsumableProduct> = ({ item }) => (
    <ConsumableCardView
      product={item}
      variant={ConsumableCardVariant.Regular}
      source={source}
    />
  );

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title={title} />
      {/* 좌우 패딩 바깥까지 흘린다(HM-11과 같은 구조). */}
      <FlatList
        data={visibleProducts}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CONSUMABLE_CARD_WIDTH + CARD_GAP}
        snapToAlignment='start'
        decelerationRate='fast'
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      />
      <CoupangDisclaimerView style={styles.disclaimer} />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  carousel: {
    marginHorizontal: -AcgLayout.screenPadding,
  },
  carouselContent: {
    alignItems: 'stretch',
    gap: CARD_GAP,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  disclaimer: {
    marginTop: 10,
  },
});

export default ConsumableCarouselSectionView;
