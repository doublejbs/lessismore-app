import { FC, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import ConsumableAnalyticsSource from '@/model/consumable/ConsumableAnalyticsSource';
import ConsumableCardVariant from '@/model/consumable/ConsumableCardVariant';
import { ConsumableProduct } from '@/model/consumable/ConsumableProduct';
import { CONSUMABLE_MERCHANT_SOURCE_KEY } from '@/model/consumable/ConsumableMerchantText';
import app from '@/model/app/App';

interface Props {
  product: ConsumableProduct;
  variant: ConsumableCardVariant;
  // 애널리틱스 `source` 파라미터(AN-3)
  source: ConsumableAnalyticsSource;
  style?: StyleProp<ViewStyle>;
}

export const CONSUMABLE_CARD_WIDTH = 152;

const REGULAR_BAND_HEIGHT = 120;
const REGULAR_BODY_PADDING = 12;
const COMPACT_BODY_PADDING = 8;
const FALLBACK_ICON_SIZE = 28;
const MAX_FONT_SIZE_MULTIPLIER = 1.5;

/**
 * 소모품 카드(CP-2). 세 자리(배낭 상세·홈·커뮤니티)가 이 컴포넌트 하나를 쓴다.
 *
 * - 상단 흰 밴드 + `contain` — 쇼핑몰 상품 이미지는 대부분 흰 배경이라 letterbox가 이어진다.
 *   이미지가 없거나 실패하면 같은 크기 밴드에 아이콘으로 떨어진다(카드 높이 유지).
 * - 라임·셰브론·그림자를 두지 않는다 — 카드 전체가 눌리는 면이다.
 * - Compact는 커뮤니티 카드 면(`controlFill`) 위에 놓여 면을 `paper`로 바꾸고 한 줄 소개를 뺀다.
 */
const ConsumableCardView: FC<Props> = ({ product, variant, source, style }) => {
  // 실패한 URL을 기억한다 — 운영자가 URL을 바꾸면 새 URL로 다시 시도한다.
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const isCompact = variant === ConsumableCardVariant.Compact;
  const showImage = Boolean(product.imageUrl) && failedImageUrl !== product.imageUrl;
  const merchantLabel = app
    .getL10n()
    .t(CONSUMABLE_MERCHANT_SOURCE_KEY[product.merchant]);

  // 애널리틱스를 먼저 보내고 연다(CP-3). 인앱 브라우저로 감싸지 않는다 — 유니버설 링크로
  // 쇼핑몰 앱(쿠팡·네이버)에 넘어가야 수수료 귀속이 성립한다. 열기 실패는 조용히 무시한다.
  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('consumable_product', {
      source,
      product_id: product.id,
      merchant: product.merchant,
    });
    Linking.openURL(product.linkUrl).catch(() => {});
  };

  const handleImageError = () => {
    setFailedImageUrl(product.imageUrl ?? null);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isCompact ? styles.cardCompact : styles.cardRegular,
        pressed && styles.cardPressed,
        style,
      ]}
      onPress={handlePress}
      accessibilityRole='link'
      accessibilityLabel={app
        .getL10n()
        .t('consumable.accessibilityOpen', {
          name: product.name,
          merchant: merchantLabel,
        })}
    >
      <View style={isCompact ? styles.bandCompact : styles.bandRegular}>
        {showImage ? (
          <Image
            source={{ uri: product.imageUrl! }}
            style={styles.image}
            contentFit='contain'
            cachePolicy='memory-disk'
            onError={handleImageError}
            accessible={false}
          />
        ) : (
          <Ionicons
            name='cart-outline'
            size={FALLBACK_ICON_SIZE}
            color={Acg.textMuted}
          />
        )}
      </View>
      <View style={isCompact ? styles.bodyCompact : styles.bodyRegular}>
        <PretendardText
          weight='medium'
          style={isCompact ? styles.nameCompact : styles.nameRegular}
          numberOfLines={2}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          {product.name}
        </PretendardText>
        {!isCompact && product.pitch ? (
          <PretendardText
            style={styles.pitch}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          >
            {product.pitch}
          </PretendardText>
        ) : null}
        {/* 출처 표기는 필수다(DM §1 경계 ③). 배지 면이 아니라 메타 글자 조각이다(HM-8). */}
        <PretendardText
          style={styles.source}
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        >
          {merchantLabel}
        </PretendardText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: AcgRadius.thumb,
  },
  cardRegular: {
    width: CONSUMABLE_CARD_WIDTH,
    backgroundColor: Acg.controlFill,
  },
  // 연회색 커뮤니티 카드 면 위라 흰 면으로 바꾼다 — 연회색 위 연회색은 보이지 않는다.
  cardCompact: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  cardPressed: {
    opacity: 0.7,
  },
  // 밴드만 고정 높이다 — 본문은 내용 높이(Dynamic Type, HM-8).
  bandRegular: {
    height: REGULAR_BAND_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.paper,
  },
  bandCompact: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Acg.paper,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bodyRegular: {
    flexGrow: 1,
    gap: 4,
    padding: REGULAR_BODY_PADDING,
  },
  // 3등분 폭이라 패딩을 줄여 이름 두 줄에 글자 폭을 돌려준다.
  bodyCompact: {
    flexGrow: 1,
    gap: 2,
    padding: COMPACT_BODY_PADDING,
  },
  nameRegular: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  nameCompact: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  pitch: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  source: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default ConsumableCardView;
