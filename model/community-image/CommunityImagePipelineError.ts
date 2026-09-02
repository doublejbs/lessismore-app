import CommunityImageError from './CommunityImageError';

/**
 * enum 코드와 원인을 함께 전달하는 커뮤니티 사진 오류다(CM-6, DM-9, DM-28).
 * 원인 보존을 위해 공개 사진 오류를 개인 장비 사진 경로의 오류와 섞지 않는다.
 */
class CommunityImagePipelineError extends Error {
  public readonly code: CommunityImageError;
  public readonly cause?: unknown;

  public constructor(code: CommunityImageError, cause?: unknown) {
    super(code);
    this.name = 'CommunityImagePipelineError';
    this.code = code;

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export default CommunityImagePipelineError;
