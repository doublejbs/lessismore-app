import { useEffect, useState } from 'react';
import { GestureResponderEvent, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import GearRowActions from '@/model/browse/GearRowActions';
import { GearAddContext } from '@/model/gear/GearAddContext';
import GearAddMode from '@/model/gear/GearAddMode';
import app from '@/model/app/App';

interface Params {
  gear: Gear;
  actions: GearRowActions;
  bag: Bag;
  // GE-8: 장비 추가 검색(/search) 진입 시 담기 동작 컨텍스트. 미지정이면 탐색 기본(배낭 담기 모달).
  gearAddContext?: GearAddContext | undefined;
  /**
   * 이 항목에 쿠팡 링크가 실제로 붙었을 때 알린다(FD-2).
   *
   * 수수료 고지는 리스트 푸터가 1회만 노출하는데, `coupangUrl`이 항목마다 마운트 후
   * **지연 로드**돼 부모가 미리 알 수 없다. 그래서 항목이 알려 준다.
   * **참조가 고정된 콜백을 넘긴다**(`useCallback`) — 로드 effect의 의존성이라 매 렌더 새 함수를
   * 넘기면 쿠팡 URL을 계속 다시 조회한다.
   */
  onCoupangLinkLoaded?: (() => void) | undefined;
}

/**
 * FD-2: 피드·검색 결과의 장비 항목 동작(담기·제거·상세 이동·쿠팡 링크 지연 로드).
 *
 * 목록 항목의 표현은 화면마다 다르지만(2컬럼 카드 / 단일 컬럼 행) 동작은 같아서, 뷰가
 * 갈릴 때 로직이 복제되지 않도록 이 훅으로 모았다. 애널리틱스 이벤트 이름도 여기서만
 * 정해진다(`feed_card`·`feed_add`·`feed_coupang`).
 *
 * `gear.isAdded()` 같은 observable 읽기는 호출하는 `observer` 컴포넌트의 렌더 안에서
 * 일어나므로 반응성은 그대로 유지된다.
 */
const useGearRowState = ({
  gear,
  actions,
  bag,
  gearAddContext,
  onCoupangLinkLoaded,
}: Params) => {
  const router = useRouter();
  const isAdded = gear.isAdded();

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

      // 링크가 실제로 붙은 항목만 알린다 — 푸터 수수료 고지의 노출 조건이다(위 prop 주석).
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

  return {
    isAdded,
    isInThisBag,
    bagCtxId,
    loading,
    showModal,
    coupangUrl,
    handleCardPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
    handleCoupangPress,
  };
};

export default useGearRowState;
