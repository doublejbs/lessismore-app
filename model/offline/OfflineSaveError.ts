import OfflineSaveErrorType from './OfflineSaveErrorType';

// 오프라인 저장 실패. `type`으로 토스트 문구를 고른다(`OfflineTrip.getSaveErrorMessage`).
class OfflineSaveError extends Error {
  public constructor(public readonly type: OfflineSaveErrorType) {
    super(`Offline save failed: ${type}`);
  }

  public static typeOf(error: unknown): OfflineSaveErrorType {
    if (error instanceof OfflineSaveError) {
      return error.type;
    }

    return OfflineSaveErrorType.Unknown;
  }
}

export default OfflineSaveError;
