import { FC, useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Linking,
  GestureResponderEvent,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import GearRowActions from '@/model/browse/GearRowActions';
import PretendardText from '@/components/PretendardText';
import LoadingView from '@/components/ui/LoadingView';
import LoadingIconView from '@/components/ui/LoadingIconView';
import SearchGearAddToBagModalView from '@/components/search/SearchGearAddToBagModalView';
import app from '@/model/app/App';

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
}

// FD-2: 피드 카드. 큰 이미지 → 브랜드 → 이름 → 무게, 우측 상단 담기 CTA, coupangUrl이 있으면 하단 최저가 링크.
// coupangUrl은 Algolia hit·Gear에 없고 /gear 문서에만 있어(WarehouseDetail과 동일 경로) 마운트 시 지연 로드한다.
const FeedCardView: FC<Props> = ({ gear, actions, bag }) => {
  const isAdded = gear.isAdded();
  const imageUrl = gear.getImageUrl();
  const weight = gear.getWeight();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
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

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
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
          activeOpacity={0.8}
        >
          <Ionicons name='checkmark' size={20} color='#fff' />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <Ionicons name='add' size={20} color='#fff' />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable style={styles.card} onPress={handleCardPress}>
        <View style={styles.imageContainer}>
          {imageUrl && !imageError ? (
            <>
              {imageLoading ? (
                <View style={styles.imageLoading}>
                  <LoadingIconView />
                </View>
              ) : null}
              <Image
                source={{ uri: imageUrl }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={[styles.image, { opacity: imageLoading ? 0 : 1 }]}
                resizeMode='cover'
              />
            </>
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
          <View style={styles.ctaContainer}>{renderCta()}</View>
        </View>

        <View style={styles.info}>
          <PretendardText style={styles.company}>
            {gear.getDisplayCompany()}
          </PretendardText>
          <PretendardText style={styles.name} weight='semibold' numberOfLines={2}>
            {gear.getDisplayName()}
          </PretendardText>
          {weight ? (
            <PretendardText style={styles.weight}>{`${weight} g`}</PretendardText>
          ) : null}
        </View>

        {coupangUrl ? (
          <View style={styles.coupang}>
            <TouchableOpacity
              style={styles.coupangLink}
              onPress={handleCoupangPress}
              activeOpacity={0.6}
            >
              <PretendardText style={styles.coupangText}>
                쿠팡에서 최저가 보기
              </PretendardText>
              <Ionicons name='chevron-forward' size={13} color='#555555' />
            </TouchableOpacity>
            <PretendardText style={styles.coupangDisclaimer}>
              파트너스 활동으로 수수료를 받을 수 있습니다.
            </PretendardText>
          </View>
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
    marginBottom: 28,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EBEBEB',
  },
  ctaContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  ctaLoading: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    paddingTop: 12,
    gap: 4,
  },
  company: {
    fontSize: 12,
    color: '#888',
  },
  name: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
  },
  weight: {
    fontSize: 13,
    color: '#555',
  },
  coupang: {
    paddingTop: 10,
    gap: 3,
  },
  coupangLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  coupangText: {
    fontSize: 13,
    color: '#555555',
  },
  coupangDisclaimer: {
    fontSize: 11,
    color: '#B0B0B0',
  },
});

export default observer(FeedCardView);
