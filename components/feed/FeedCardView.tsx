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
import {
  Liquid,
  LiquidFont,
  LiquidRadius,
  LiquidShadow,
  LiquidMotion,
} from '@/constants/DesignTokens';
import LoadingView from '@/components/ui/LoadingView';
import SearchGearAddToBagModalView from '@/components/search/SearchGearAddToBagModalView';
import app from '@/model/app/App';

// FD-2: 2컬럼 그리드 셀 기준. CTA 원형 버튼 크기(축소하되 hitSlop으로 44 실효 터치 타깃 확보).
const CTA_SIZE = 32;
const CTA_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

interface Props {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
  /**
   * 이 카드에 쿠팡 링크가 실제로 붙었을 때 알린다(FD-2).
   *
   * 수수료 고지는 리스트 푸터가 1회만 노출하는데, `coupangUrl`이 카드마다 마운트 후
   * **지연 로드**돼 부모가 미리 알 수 없다. 그래서 카드가 알려 준다.
   * **참조가 고정된 콜백을 넘긴다**(`useCallback`) — 로드 effect의 의존성이라 매 렌더 새 함수를
   * 넘기면 쿠팡 URL을 계속 다시 조회한다.
   */
  onCoupangLinkLoaded?: (() => void) | undefined;
}

// FD-2: 피드 텍스트 카드(2컬럼 그리드 셀, Liquid Depth). 장비 이미지를 쓰지 않으므로
// (DataModel §1 장비 이미지 미제공 원칙) 이미지 칸 없이 종이 면만으로 그리드 리듬을 만든다.
// 구성은 위→아래로 브랜드 → 이름(2줄) → 색상 → 무게이며, 이미지가 하던 시각 위계는 무게가 대신한다.
// 담기 CTA는 **미담김 = 라임 면 + add / 담김 = 잉크 면 + 라임 checkmark**로 뒤집힌다 —
// 라임이 "아직 안 담김"을 뜻하는 자리라 담긴 카드에서 라임 면이 사라져야 스캔이 된다.
// 담기 CTA는 카드 우상단, coupangUrl이 있으면 하단 축약 링크.
// 수수료 고지는 카드마다 반복하지 않고 FeedView 리스트 푸터에서 1회 노출한다.
// coupangUrl은 Algolia hit·Gear에 없고 /gear 문서에만 있어(WarehouseDetail과 동일 경로) 마운트 시 지연 로드한다.
const FeedCardView: FC<Props> = ({
  gear,
  actions,
  bag,
  gearAddContext,
  onCoupangLinkLoaded,
}) => {
  const router = useRouter();
  const isAdded = gear.isAdded();
  const weight = gear.getWeight();
  const color = gear.getDisplayColor();

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

      const { coupangUrl: url } = await gearStore.getExternalLinks(
        gear.getId()
      );

      if (!active) {
        return;
      }

      setCoupangUrl(url);

      // 링크가 실제로 붙은 카드만 알린다 — 푸터 수수료 고지의 노출 조건이다(위 prop 주석).
      if (url) {
        onCoupangLinkLoaded?.();
      }
    };

    loadCoupangUrl();

    return () => {
      active = false;
    };
  }, [gear, onCoupangLinkLoaded]);

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
          <LoadingView duration={1000} color={Liquid.lime} />
        </View>
      );
    }

    // GE-8 배낭 컨텍스트: 이미 이 배낭에 담긴 장비는 비파괴 체크 배지(중복 담기 방지),
    // 그 외에는 담기(+) — 창고 보유 여부와 무관하게 제거 동작을 노출하지 않는다.
    if (bagCtxId) {
      if (isInThisBag) {
        return (
          <View style={styles.ownedBadge}>
            <Ionicons name='checkmark' size={18} color={Liquid.lime} />
          </View>
        );
      }
    } else if (isAdded) {
      return (
        <TouchableOpacity
          style={styles.ownedBadge}
          onPress={handleRemovePress}
          hitSlop={CTA_HIT_SLOP}
          activeOpacity={LiquidMotion.pressOpacity}
          accessibilityRole='button'
          accessibilityLabel={`${gear.getDisplayName()} 창고에서 빼기`}
        >
          <Ionicons name='checkmark' size={18} color={Liquid.lime} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddPress}
        hitSlop={CTA_HIT_SLOP}
        activeOpacity={LiquidMotion.pressOpacity}
        accessibilityRole='button'
        accessibilityLabel={
          bagCtxId
            ? `${gear.getDisplayName()} 배낭에 담기`
            : `${gear.getDisplayName()} 창고에 담기`
        }
      >
        <Ionicons name='add' size={18} color={Liquid.limeOn} />
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

          {color ? (
            <PretendardText
              style={styles.color}
              weight='regular'
              numberOfLines={1}
            >
              {color}
            </PretendardText>
          ) : null}

          {/* 무게는 숫자라 콘덴스드를 쓴다 — 카드의 시각 앵커. 단위는 한 단계 낮춰
              숫자가 먼저 읽히게 한다. */}
          {weight ? (
            <PretendardText style={styles.weightWrap} numberOfLines={1}>
              <PretendardText style={styles.weight}>{weight}</PretendardText>
              <PretendardText style={styles.weightUnit}>g</PretendardText>
            </PretendardText>
          ) : null}

          {coupangUrl ? (
          <TouchableOpacity
            style={styles.coupangLink}
            onPress={handleCoupangPress}
            activeOpacity={LiquidMotion.pressOpacity}
          >
            <PretendardText weight='medium' style={styles.coupangText}>
              쿠팡 최저가
            </PretendardText>
            <Ionicons
              name='chevron-forward'
              size={11}
              color={Liquid.limeInk}
            />
          </TouchableOpacity>
          ) : null}
        </View>
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
  // 종이 카드 — 같은 행의 카드 높이를 맞추려 flex:1로 늘린다.
  cardFace: {
    flex: 1,
    width: '100%',
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
    padding: 16,
    gap: 4,
  },
  // 브랜드(좌) + 담기 CTA(우상단) 한 행.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  // 미담김 = 라임 면. 이 화면에서 라임은 "아직 내 것이 아님"을 뜻한다.
  addButton: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Liquid.lime,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 담김 = 잉크 면 + 라임 체크. 면이 뒤집혀야 담긴 카드가 한눈에 걸러진다.
  ownedBadge: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Liquid.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaLoading: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    backgroundColor: Liquid.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  company: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: Liquid.inkMuted,
  },
  name: {
    fontSize: 15,
    lineHeight: 20,
    color: Liquid.ink,
  },
  color: {
    fontSize: 12,
    lineHeight: 16,
    color: Liquid.inkSubtle,
  },
  weightWrap: {
    marginTop: 6,
  },
  weight: {
    fontFamily: LiquidFont.condensed,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: Liquid.ink,
  },
  weightUnit: {
    fontSize: 16,
    color: Liquid.inkMuted,
  },
  coupangLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 8,
  },
  // 밝은 면 위 라임 계열 글자는 limeInk — 라임을 글자색으로 직접 쓰지 않는다.
  coupangText: {
    fontSize: 12,
    color: Liquid.limeInk,
  },
});

export default observer(FeedCardView);
