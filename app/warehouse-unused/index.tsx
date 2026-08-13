import { useLocalSearchParams } from 'expo-router';
import WarehouseUnusedWrapper from '@/components/warehouse/WarehouseUnusedWrapper';
import GearFilter from '@/model/gear/GearFilter';

/**
 * 안 쓴 장비 화면(WH-2-1). 창고 하단 우측 플로팅 버튼과 홈 `내 기록`(HM-7)의
 * `안 쓴 장비` 지표가 이 라우트로 들어온다 — 창고에 필터를 걸어 두던 방식을
 * 대신한다(2026-08-13).
 *
 * `category`는 창고에서 승계한 1차 카테고리다(2026-08-13). 버튼 라벨의 개수가
 * 창고에 걸린 범위에서 세어진 값이라, 같은 범위로 열어 수를 맞춘다.
 * 홈에서 들어올 때는 없으므로 전체로 열린다.
 */
export default function WarehouseUnusedPage() {
  const { category } = useLocalSearchParams<{
    category?: string;
  }>();

  return (
    <WarehouseUnusedWrapper
      initialCategory={category ? (category as GearFilter) : undefined}
    />
  );
}
