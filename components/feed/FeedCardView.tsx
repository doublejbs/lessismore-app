import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Linking,
  GestureResponderEvent,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import GearRowActions from '@/model/browse/GearRowActions';
import { GearAddContext } from '@/model/gear/GearAddContext';
import GearAddMode from '@/model/gear/GearAddMode';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
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
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
}

// FD-2: 피드 텍스트 카드(2컬럼 그리드 셀). 장비 이미지를 쓰지 않으므로(DataModel §1 장비 이미지
// 미제공 원칙) 이미지 칸·플레이스홀더 없이 카드 면(inputBg + radius)만으로 그리드 리듬을 만든다.
// 구성은 위→아래로 브랜드 → 이름(2줄) → 무게이며, 이미지가 하던 시각 위계는 무게가 대신한다.
// 담기 CTA는 카드 우상단, coupangUrl이 있으면 하단 축약 링크.
// 수수료 고지는 카드마다 반복하지 않고 FeedView 리스트 푸터에서 1회 노출한다.
// coupangUrl은 Algolia hit·Gear에 없고 /gear 문서에만 있어(WarehouseDetail과 동일 경로) 마운트 시 지연 로드한다.
const FeedCardView: FC<Props> = ({ gear, actions, bag, gearAddContext }) => {
  const router = useRouter();
  const isAdded = gear.isAdded();
  const weight = gear.getWeight();

  // GE-8 배낭 컨텍스트: 이 배낭에 담는 흐름. 창고 보유 여부와 무관하게 파괴적 제거 대신 담기로 동작한다.
  const bagCtxId =
    gearAddContext?.mode === GearAddMode.Bag ? gearAddContext.bagId : undefined;
  const isInThisBag = !!bagCtxId && gear.getData().bags.includes(bagCtxId);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
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

    // GE-8 배낭 컨텍스트: 상세에서도 그 배낭에 담도록 bagId를 넘긴다.
    if (bagCtxId) {
      router.push(`/gear-detail/${gear.getId()}?bagId=${bagCtxId}`);
    } else {
      actions.goToGearDetail(gear);
    }
  };

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      // GE-8 배낭 컨텍스트: 창고에 없으면 등록 후, 그 배낭에 바로 담는다(재선택 모달 없음).
      // 이미 창고 보유 장비는 재등록하지 않아 gear-rank 중복 집계를 피한다.
      if (bagCtxId) {
        if (!isAdded) {
          const registered = await actions.registerSingle(gear);

          if (!registered) {
            return;
          }
        }

        app.getAnalyticsManager()?.logClick('feed_add', { added: true });

        const added = await bag.addGearToBag(bagCtxId, gear);

        if (added) {
          app.getToastManager()?.show({ message: '배낭에 담았어요.' });
        }

        return;
      }

      // 창고 컨텍스트 / 탐색 기본: 창고 등록.
      const success = await actions.registerSingle(gear);

      if (!success) {
        return;
      }

      app.getAnalyticsManager()?.logClick('feed_add', { added: true });

      if (gearAddContext) {
        // 창고 장비 추가: 창고 등록만(배낭 담기 모달 생략).
        app.getToastManager()?.show({ message: '창고에 담았어요.' });
      } else {
        // 탐색 기본: 창고 등록 후 배낭 담기 모달(SR-3).
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

  const renderCta = () => {
    if (loading) {
      return (
        <View style={styles.ctaLoading}>
          <LoadingView duration={1000} color={Color.background} />
        </View>
      );
    }

    // GE-8 배낭 컨텍스트: 이미 이 배낭에 담긴 장비는 비파괴 체크 배지(중복 담기 방지),
    // 그 외에는 담기(+) — 창고 보유 여부와 무관하게 제거 동작을 노출하지 않는다.
    if (bagCtxId) {
      if (isInThisBag) {
        return (
          <View style={styles.ownedBadge}>
            <Ionicons name='checkmark' size={18} color={Color.background} />
          </View>
        );
      }
    } else if (isAdded) {
      return (
        <TouchableOpacity
          style={styles.ownedBadge}
          onPress={handleRemovePress}
          hitSlop={CTA_HIT_SLOP}
          activeOpacity={0.8}
          accessibilityRole='button'
          accessibilityLabel={`${gear.getDisplayName()} 창고에서 빼기`}
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
        accessibilityRole='button'
        accessibilityLabel={
          bagCtxId
            ? `${gear.getDisplayName()} 배낭에 담기`
            : `${gear.getDisplayName()} 창고에 담기`
        }
      >
        <Ionicons name='add' size={18} color={Color.background} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable style={styles.card} onPress={handleCardPress}>
        <View style={styles.cardFace}>
          <View style={styles.cardHeader}>
            <PretendardText
              style={styles.company}
              weight='semibold'
              numberOfLines={1}
            >
              {gear.getDisplayCompany()}
            </PretendardText>
            {renderCta()}
          </View>

          <PretendardText
            style={styles.name}
            weight='semibold'
            numberOfLines={2}
            lineBreakStrategyIOS='hangul-word'
          >
            {gear.getDisplayName()}
          </PretendardText>

          {weight ? (
            <PretendardText
              style={styles.weight}
              weight='bold'
            >{`${weight}g`}</PretendardText>
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
  // 텍스트 카드 면 — 이미지 대신 이 면이 2컬럼 그리드의 리듬을 만든다. 높이는 콘텐츠 기준(정방형 강제 없음).
  // flex: 1 로 같은 행의 카드 면을 늘려 면 아래 빈 공간이 뜨지 않게 한다(카드 전체 하단 기준 정렬).
  cardFace: {
    flex: 1,
    width: '100%',
    borderRadius: Radius.card,
    backgroundColor: Color.inputBg,
    padding: Spacing.item,
    gap: 6,
  },
  // 브랜드(좌) + 담기 CTA(우상단) 한 행.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
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
  // 로딩 중에도 담기/보유 CTA와 같은 대비를 유지한다(카드 면 inputBg 위에서 흰 배경은 묻힌다).
  ctaLoading: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Color.chipActiveBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FD-2: 브랜드는 제품 식별의 첫 축이라 이름(name)과 동일한 타이포로 표시한다(길면 1줄 말줄임).
  company: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  name: {
    fontSize: 14,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  // 카드에서 가장 큰 활자 — 이미지가 하던 시각 앵커를 무게가 대신한다(FD-2).
  weight: {
    fontSize: 26,
    lineHeight: 32,
    color: Color.textPrimary,
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
