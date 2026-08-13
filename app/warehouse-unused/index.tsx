import WarehouseUnusedWrapper from '@/components/warehouse/WarehouseUnusedWrapper';

/**
 * 안 쓴 장비 화면(WH-2-1). 창고 하단 우측 플로팅 버튼과 홈 `내 기록`(HM-7)의
 * `안 쓴 장비` 지표가 이 라우트로 들어온다 — 창고에 필터를 걸어 두던 방식을
 * 대신한다(2026-08-13).
 */
export default function WarehouseUnusedPage() {
  return <WarehouseUnusedWrapper />;
}
