// 배낭별 장비 사용 여부 3-상태(GD-10). 미기록은 '사용 안함'과 구분한다(BD-5 정합).
enum GearUsageStatus {
  Used = 'USED',
  Useless = 'USELESS',
  Unrecorded = 'UNRECORDED',
}

export default GearUsageStatus;
