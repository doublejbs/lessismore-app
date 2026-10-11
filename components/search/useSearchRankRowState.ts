import { useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import Gear from '@/model/gear/Gear';
import SearchRank from '@/model/search/SearchRank';
import app from '@/model/app/App';

/**
 * SR-4 / FD-6: 인기 순위 행의 동작(상세 이동·창고 추가·제거·배낭 담기 모달 상태).
 *
 * 전용 순위 화면과 피드 상단 섹션이 같은 동작을 해야 하므로(FD-6 "담기·제거는 SR-4와 같다")
 * 핸들러를 한 곳에 모아 두 곳이 갈라지지 않게 한다. 애널리틱스 이벤트 이름도 여기서만 정해진다.
 *
 * 추가·제거 후 `SearchRank`는 로딩 플래그 없이 목록만 다시 읽어 보유 배지를 갱신한다 —
 * 스켈레톤으로 바뀌지 않으므로 스크롤 위치가 유지된다.
 */
const useSearchRankRowState = (searchRank: SearchRank) => {
  const [loadingGearIds, setLoadingGearIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);

  const startLoading = (gear: Gear) => {
    setLoadingGearIds(prev => new Set(prev).add(gear.getId()));
  };

  const stopLoading = (gear: Gear) => {
    setLoadingGearIds(prev => {
      const newSet = new Set(prev);

      newSet.delete(gear.getId());

      return newSet;
    });
  };

  const isGearLoading = (gear: Gear) => {
    return loadingGearIds.has(gear.getId());
  };

  const handleGearPress = (gear: Gear) => {
    app.getAnalyticsManager()?.logClick('search_rank_item');
    searchRank.goToGearDetail(gear);
  };

  const handleAddPress = async (e: GestureResponderEvent, gear: Gear) => {
    e.preventDefault();
    e.stopPropagation();

    startLoading(gear);

    try {
      const success = await searchRank.registerSingle(gear);

      if (success) {
        app
          .getAnalyticsManager()
          ?.logClick('search_add', { target: 'warehouse' });
        setSelectedGear(gear);
        setShowModal(true);
      }
    } finally {
      stopLoading(gear);
    }
  };

  const handleRemovePress = async (e: GestureResponderEvent, gear: Gear) => {
    e.preventDefault();
    e.stopPropagation();

    startLoading(gear);

    try {
      await searchRank.removeSingle(gear);
    } finally {
      stopLoading(gear);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    selectedGear,
    isGearLoading,
    handleGearPress,
    handleAddPress,
    handleRemovePress,
    handleCloseModal,
  };
};

export default useSearchRankRowState;
