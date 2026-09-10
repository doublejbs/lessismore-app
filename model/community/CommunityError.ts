import CommunityValidationError from './CommunityValidationError';

class CommunityError extends Error {
  public readonly code: CommunityValidationError;

  public constructor(code: CommunityValidationError) {
    super(code);
    this.name = 'CommunityError';
    this.code = code;
  }
}

export default CommunityError;
