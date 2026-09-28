// SUB-8: 구매 결과(`subscription_purchase`의 `result` 값과 같다).
enum PurchaseResult {
  Success = 'success',
  Cancelled = 'cancelled',
  // 결제 승인 대기(iOS Ask to Buy·안드로이드 보류 결제). 승인되면 권한 리스너가 반영한다.
  Pending = 'pending',
  Error = 'error',
}

export default PurchaseResult;
