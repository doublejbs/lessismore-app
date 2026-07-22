/**
 * 건강 허브 읽기 권한 상태(HA-2).
 *
 * iOS 주의: HealthKit은 **읽기 권한의 거부 여부를 앱에 알려주지 않는다.**
 * 사용자가 거부했는지 데이터가 없는지 구분하면 그 자체로 건강 정보가 새기 때문이다.
 * 따라서 iOS에서 `Denied`는 권한 시트 자체가 실패한 경우에만 나오고,
 * "요청했지만 사용자가 끈" 상태는 `Granted`로 보이면서 조회 결과만 비어 있다.
 * UI는 이 점을 감안해 "권한 거부" 대신 "기록이 없어요 + 설정에서 확인" 형태로 안내해야 한다.
 */
enum HealthPermissionStatus {
  /** 플랫폼·기기가 건강 허브를 지원하지 않음 (웹, 아직 미구현 플랫폼, iPad 등) */
  Unsupported = 'unsupported',
  /** 아직 권한 시트를 띄운 적 없음 */
  NotDetermined = 'notDetermined',
  /** 권한 요청이 거부됨 */
  Denied = 'denied',
  /** 권한 요청이 완료됨 (위 주의사항 참고) */
  Granted = 'granted',
}

export default HealthPermissionStatus;
