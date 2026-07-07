import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Linking,
  GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import GearRowActions from '@/model/browse/GearRowActions';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from '@/components/search/SearchGearAddToBagModalView';
import app from '@/model/app/App';

// FD-2: 2컬럼 그리드 셀 기준. CTA 원형 버튼 크기(축소하되 hitSlop으로 44 실효 터치 타깃 확보).
const CTA_SIZE = 36;
const CTA_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
}

// FD-2: 피드 카드(2컬럼 그리드 셀). 정방형 이미지 → 브랜드 → 이름 → 무게, 우측 상단 담기 CTA, coupangUrl이 있으면 하단 축약 링크.
// 수수료 고지는 카드마다 반복하지 않고 FeedView 리스트 푸터에서 1회 노출한다.
// coupangUrl은 Algolia hit·Gear에 없고 /gear 문서에만 있어(WarehouseDetail과 동일 경로) 마운트 시 지연 로드한다.
const FeedCardView: FC<Props> = ({ gear, actions, bag }) => {
  const isAdded = gear.isAdded();
  const imageUrl = gear.getImageUrl();
  const weight = gear.getWeight();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [coupangUrl, setCoupangUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const loadCoupangUrl = async () => {
      const gearStore = app.getGearStore();

      if (!gearStore) {
        return;
      }

      const url = await gearStore.getCoupangUrl(gear.getId());

      if (active) {
        setCoupangUrl(url);
      }
    };

    loadCoupangUrl();

    return () => {
      active = false;
    };
  }, [gear]);

  const handleCardPress = () => {
    app.getAnalyticsManager()?.logClick('feed_card');
    actions.goToGearDetail(gear);
  };

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      const success = await actions.registerSingle(gear);

      if (success) {
        app.getAnalyticsManager()?.logClick('feed_add', { added: true });
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
      app.getAnalyticsManager()?.logClick('feed_add', { added: false });
      await actions.removeSingle(gear);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCoupangPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!coupangUrl) {
      return;
    }

    app.getAnalyticsManager()?.logClick('feed_coupang');

    try {
      await Linking.openURL(coupangUrl);
    } catch {
      // 링크 열기 실패는 조용히 무시
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const renderCta = () => {
    if (loading) {
      return (
        <View style={styles.ctaLoading}>
          <LoadingView duration={1000} />
        </View>
      );
    }

    if (isAdded) {
      return (
        <TouchableOpacity
          style={styles.ownedBadge}
          onPress={handleRemovePress}
          hitSlop={CTA_HIT_SLOP}
          activeOpacity={0.8}
        >
          <Ionicons name='checkmark' size={18} color={Color.background} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddPress}
        hitSlop={CTA_HIT_SLOP}
        activeOpacity={0.8}
      >
        <Ionicons name='add' size={18} color={Color.background} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable style={styles.card} onPress={handleCardPress}>
        <View style={styles.imageContainer}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              onError={handleImageError}
              style={styles.image}
              contentFit='cover'
              transition={150}
            />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
          <View style={styles.ctaContainer}>{renderCta()}</View>
        </View>

        <View style={styles.info}>
          <PretendardText style={styles.company} numberOfLines={1}>
            {gear.getDisplayCompany()}
          </PretendardText>
          <PretendardText style={styles.name} weight='semibold' numberOfLines={2}>
            {gear.getDisplayName()}
          </PretendardText>
          {weight ? (
            <PretendardText style={styles.weight}>{`${weight}g`}</PretendardText>
          ) : null}
        </View>

        {coupangUrl ? (
          <TouchableOpacity
            style={styles.coupangLink}
            onPress={handleCoupangPress}
            activeOpacity={0.6}
          >
            <PretendardText style={styles.coupangText}>
              쿠팡 최저가
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={12}
              color={Color.textTertiary}
            />
          </TouchableOpacity>
        ) : null}
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
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.card,
    backgroundColor: Color.chipInactiveBg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Color.chipInactiveBg,
  },
  ctaContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  addButton: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Color.chipActiveBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedBadge: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Color.chipActiveBg,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  ctaLoading: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    paddingTop: 8,
    gap: 3,
  },
  company: {
    fontSize: 11,
    color: Color.textSecondary,
  },
  name: {
    fontSize: 14,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  weight: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  coupangLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
  },
  coupangText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
});

export default observer(FeedCardView);
