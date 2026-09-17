import GpxParseErrorType from './GpxParseErrorType';

// GPX 읽기 단계가 던지는 오류 (GRP-8). 사유만 싣고 문구는 모른다.
class GpxParseError extends Error {
  public readonly type: GpxParseErrorType;

  public constructor(type: GpxParseErrorType) {
    super(`GPX parse failed: ${type}`);

    this.name = 'GpxParseError';
    this.type = type;
  }
}

export default GpxParseError;
