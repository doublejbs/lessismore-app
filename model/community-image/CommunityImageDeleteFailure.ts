/**
 * 커뮤니티 공개 사진 삭제 실패 한 건의 결과다(CM-6, DM-9, DM-28).
 * 삭제 대상은 소유권 검증을 통과한 커뮤니티 경로로 한정해 개인 장비 사진과 분리한다.
 */
interface CommunityImageDeleteFailure {
  storagePath: string;
  error: unknown;
}

export default CommunityImageDeleteFailure;
