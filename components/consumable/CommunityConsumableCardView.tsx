import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import ConsumableCardVariant from '@/model/consumable/ConsumableCardVariant';
import { ConsumableProduct } from '@/model/consumable/ConsumableProduct';
import { CONSUMABLE_COMMUNITY_CARD_ITEMS } from '@/model/consumable/ConsumableSlotConstants';
import app from '@/model/app/App';
import ConsumableCardView from './ConsumableCardView';
import CoupangDisclaimerView from './CoupangDisclaimerView';

interface Props {
  // 이 카드에 보일 상품(호출하는 쪽이 순환해 ≤3개로 잘라 넘긴다, CP-6)
  products: ConsumableProduct[];
  // 애널리틱스 `source`(AN-3)
  source?: string;
}

const CARD_PADDING = 16;
const ITEM_GAP = 8;
const MAX_FONT_SIZE_MULTIPLIER = 1.5;

/**
 * 커뮤니티 피드 사이 소모품 카드(CP-6). 게시글 카드(`CommunityFeedCardView`)와 같은 바깥 문법
 * (`controlFill` 면 + 모서리 12 + 패딩 16)이고, 바깥 면은 눌리지 않는다 — 터치 타깃은
 * 안의 소모품 카드 각각이다(CM-11 중첩 탭 금지).
 */
const CommunityConsumableCardView: FC<Props> = ({
  products,
  source = 'community',
}) => {
  if (products.length === 0) {
    return null;
  }

  const visibleProducts = products.slice(0, CONSUMABLE_COMMUNITY_CARD_ITEMS);

  return (
    <View style={styles.card}>
      {/* 게시글 카드의 작성자·시각 자리 — 사용자 글이 아님을 첫 줄에서 알린다. 배지 면 없음(HM-8). */}
      <PretendardText
        style={styles.label}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      >
        {app.getL10n().t('consumable.communityLabel')}
      </PretendardText>
      <PretendardText
        weight='medium'
        style={styles.title}
        numberOfLines={2}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      >
        {app.getL10n().t('consumable.homeTitle')}
      </PretendardText>
      <View style={styles.row}>
        {visibleProducts.map(product => (
          <ConsumableCardView
            key={product.id}
            product={product}
            variant={ConsumableCardVariant.Compact}
            source={source}
          />
        ))}
        {/* 3개 미만이어도 열 폭을 유지해 카드가 늘어나지 않게 빈 칸을 채운다. */}
        {Array.from({
          length: CONSUMABLE_COMMUNITY_CARD_ITEMS - visibleProducts.length,
        }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.emptyColumn} />
        ))}
      </View>
      <CoupangDisclaimerView />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: CARD_PADDING,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  label: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  // 게시글 제목과 같은 단(CommunityFeedCardView title: rowTitle + medium).
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: ITEM_GAP,
    marginVertical: 4,
  },
  emptyColumn: {
    flex: 1,
  },
});

export default CommunityConsumableCardView;
