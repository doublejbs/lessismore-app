// SUB-10: 7일 무료 체험 자격. 스토어 계정당 한 번이며 스토어가 판단한다.
enum TrialEligibility {
  Eligible = 'eligible',
  // 이미 체험했거나 상품에 체험이 없다.
  Ineligible = 'ineligible',
  // 아직 모르거나 조회에 실패했다 — 화면은 자격 없음으로 그린다(있다고 했는데 바로 결제되면 안 된다).
  Unknown = 'unknown',
}

export default TrialEligibility;
