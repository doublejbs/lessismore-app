import { useLocalSearchParams } from 'expo-router';
import WarehouseWrapper from '@/components/warehouse/WarehouseWrapper';
import GearFilter from '@/model/gear/GearFilter';

/**
 * 창고 전체 화면(WH-1). 홈 미리보기(HM-4)의 `전체 보기`로 들어오는 푸시 라우트다 —
 * 탭에서 내려온 뒤로는 여기가 창고의 정식 위치다.
 *
 * `category`는 홈에서 좁혀 온 1차 카테고리다. 들어가서 다시 고르게 하지 않는다.
 * `unused=1`은 홈 창고 카드의 정리 유도 줄(HM-4)로 들어온 경우 — 한 번도 안 쓴 장비만 본다.
 */
export default function WarehousePage() {
  const { category, unused } = useLocalSearchParams<{
    category?: string;
    unused?: string;
  }>();

  return (
    <WarehouseWrapper
      initialCategory={category ? (category as GearFilter) : undefined}
      initialUnusedOnly={unused === '1'}
    />
  );
}
