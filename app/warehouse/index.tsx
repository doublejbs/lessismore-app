import { useLocalSearchParams } from 'expo-router';
import WarehouseWrapper from '@/components/warehouse/WarehouseWrapper';
import GearFilter from '@/model/gear/GearFilter';

/**
 * 창고 전체 화면(WH-1). 홈 미리보기(HM-4)의 `전체 보기`로 들어오는 푸시 라우트다 —
 * 탭에서 내려온 뒤로는 여기가 창고의 정식 위치다.
 *
 * `category`는 홈에서 좁혀 온 1차 카테고리다. 들어가서 다시 고르게 하지 않는다.
 * (안 쓴 장비는 필터가 아니라 전용 라우트 `/warehouse-unused`가 됐다 — WH-2-1, 2026-08-13.)
 */
export default function WarehousePage() {
  const { category } = useLocalSearchParams<{
    category?: string;
  }>();

  return (
    <WarehouseWrapper
      initialCategory={category ? (category as GearFilter) : undefined}
    />
  );
}
