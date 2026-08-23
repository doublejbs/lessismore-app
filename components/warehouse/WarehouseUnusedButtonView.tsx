import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FloatingPillButton from '@/components/FloatingPillButton';
import GearFilter from '@/model/gear/GearFilter';
import app from '@/model/app/App';

interface Props {
  // 안 쓴 장비 수(WH-2-1). 0이어도 버튼은 유지하고 라벨에서 숫자만 뺀다(2026-08-13).
  count: number;
  // 창고에서 보고 있던 1차 카테고리 — 도착 화면이 승계한다(전체면 파라미터를 붙이지 않는다).
  category: GearFilter;
}

// 하단 여백. 부모 `Layout`이 이미 세이프에어리어를 넣으므로 여기서 다시 더하지 않는다.
const BUTTON_BOTTOM = 12;
// 우측 여백 — 콘텐츠 정렬선(화면 패딩 24)보다 살짝 안쪽이 아니라 그 선에 맞춘다.
const BUTTON_RIGHT = 24;

/**
 * WH-2-1 `안 쓴 장비` 입구 — 창고 하단 우측 플로팅 알약.
 *
 * **토글이 아니라 내비게이션이다**(2026-08-13 사용자 결정). 필터를 켠 창고는 "무엇이 걸려
 * 있는지"를 화면이 따로 말해 줘야 하는데, 전용 화면은 제목이 그 말을 대신한다. 피드
 * `인기 순위` → 전용 화면([Search.md](specs/Search.md) SR-4)과 같은 패턴이다.
 *
 * 비주얼도 `인기 순위`와 같은 공용 `FloatingPillButton`(라임 + 잉크 글자)이다
 * (2026-08-13 사용자 결정). 이 화면의 라임 하나(HM-8)는 이 버튼의 몫이다 — 상단 바
 * `장비 추가`는 아이콘이라 라임 면이 아니다.
 *
 * 라벨의 `N`은 **창고에 걸린 카테고리 범위**에서 센 값이라, 그 카테고리를 `?category=`로
 * 함께 넘겨 도착 화면의 목록 수와 맞춘다(2026-08-13, WH-2-1). 피드 `인기 순위`의 승계
 * (SR-4 `FeedRankingButtonView`)와 같은 방식이다. 검색어는 넘기지 않는다 — 도착 화면에
 * 검색 인풋이 없어 승계된 질의가 화면에 드러나지 않는다.
 */
const WarehouseUnusedButtonView: FC<Props> = ({ count, category }) => {
  const router = useRouter();

  const handlePress = () => {
    app
      .getAnalyticsManager()
      ?.logClick('warehouse_unused', { from: 'warehouse', category });

    if (category === GearFilter.All) {
      router.push('/warehouse-unused');
    } else {
      router.push(`/warehouse-unused?category=${category}`);
    }
  };

  return (
    <FloatingPillButton
      label={
        count > 0
          ? app.getL10n().t('warehouse.unusedGearCount', { count })
          : app.getL10n().t('warehouse.unusedGear')
      }
      onPress={handlePress}
      style={styles.position}
    />
  );
};

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    right: BUTTON_RIGHT,
    bottom: BUTTON_BOTTOM,
  },
});

export default observer(WarehouseUnusedButtonView);
