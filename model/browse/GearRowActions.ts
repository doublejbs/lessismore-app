import Gear from '@/model/gear/Gear';

// 검색 결과 행(SearchGearView)이 실제로 사용하는 액션 계약.
// SearchWarehouse와 Browse가 공통으로 구현해 결과 행을 재사용한다.
interface GearRowActions {
  registerSingle(gear: Gear): Promise<boolean>;
  removeSingle(gear: Gear): Promise<boolean>;
  goToGearDetail(gear: Gear): void;
}

export default GearRowActions;
