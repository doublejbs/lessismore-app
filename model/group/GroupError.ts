import GroupValidationError from './GroupValidationError';

// 커뮤니티의 CommunityError와 같은 구조 — 코드만 싣고 문구는 화면이 붙인다.
class GroupError extends Error {
  public readonly code: GroupValidationError;

  public constructor(code: GroupValidationError) {
    super(code);
    this.name = 'GroupError';
    this.code = code;
  }
}

export default GroupError;
