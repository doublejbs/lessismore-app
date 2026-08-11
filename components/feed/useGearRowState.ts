import { useState } from 'react';
import { GestureResponderEvent } from 'react-native';
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
}

/**
 * FD-2: 피드·검색 결과의 장비 항목 동작(담기·제거·상세 이동).
 *
 * **쿠팡 링크 지연 로드는 2026-08-11에 걷어냈다.** 목록 셀에서 쿠팡 최저가 링크를 없애면서
 * (`coupangUrl` 커버리지 0.1%) 필요가 사라졌고, 화면에 보이는 항목마다 `getExternalLinks`로
 * `/gear` 문서를 한 번씩 읽던 비용도 함께 사라졌다. 커머스 링크는 장비 상세(GD-5)에만 있다.
 *
 * 목록 항목의 표현은 화면마다 다르지만(2컬럼 카드 / 단일 컬럼 행) 동작은 같아서, 뷰가
 * 갈릴 때 로직이 복제되지 않도록 이 훅으로 모았다. 애널리틱스 이벤트 이름도 여기서만
 * 정해진다(`feed_card`·`feed_add`).
 *
 * `gear.isAdded()` 같은 observable 읽기는 호출하는 `observer` 컴포넌트의 렌더 안에서
 * 일어나므로 반응성은 그대로 유지된다.
 */
const useGearRowState = ({ gear, actions, bag, gearAddContext }: Params) => {
  const router = useRouter();
  const isAdded = gear.isAdded();

  // GE-8 배낭 컨텍스트: 이 배낭에 담는 흐름. 창고 보유 여부와 무관하게 파괴적 제거 대신 담기로 동작한다.
  const bagCtxId =
    gearAddContext?.mode === GearAddMode.Bag ? gearAddContext.bagId : undefined;
  const isInThisBag = !!bagCtxId && gear.getData().bags.includes(bagCtxId);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  return {
    isAdded,
    isInThisBag,
    bagCtxId,
    loading,
    showModal,
    handleCardPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
  };
};

export default useGearRowState;
