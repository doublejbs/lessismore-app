/**
 * GPX 읽기 실패 사유 (GRP-8).
 *
 * `GroupValidationError`(도메인 검증)와 분리한다 — 이 셋은 Firestore에 닿기 전, 사용자가 고른
 * 파일 자체를 읽는 단계에서 갈리는 값이다. 문구는 `GroupRouteErrorMessage`가 붙인다.
 */
enum GpxParseErrorType {
  // XML로 읽히지 않거나 GPX 문서가 아니다.
  Invalid = 'invalid',
  // GPX이긴 한데 그릴 수 있는 트랙(또는 경로)이 없다.
  NoTrack = 'noTrack',
  // 5MB 상한을 넘었다. 파싱 전에 판정한다.
  TooLarge = 'tooLarge',
}

export default GpxParseErrorType;
