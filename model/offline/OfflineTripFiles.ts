import { Directory, File, Paths } from 'expo-file-system';

// 기기 문서 디렉터리 아래 오프라인 저장 루트(OF-1 `offline/{bagId}/`).
const ROOT_DIRECTORY = 'offline';
const SNAPSHOT_FILE = 'snapshot.json';
const ROUTES_DIRECTORY = 'routes';
const GPX_EXTENSION = '.gpx';
// 저장 중인 임시 디렉터리 접미. 저장이 끝나야 이름을 바꿔 자리를 차지한다(반쪽 스냅샷 금지 — OF-2).
const TEMP_SUFFIX = '.tmp';
// 갱신 중 기존 저장본을 잠시 비켜 두는 디렉터리 접미. 새 저장본이 자리를 잡으면 지운다(OF-2).
const BACKUP_SUFFIX = '.old';
// 배낭 코스 원본 경로(DM-30 `bags/{bagId}/routes/{routeId}.gpx`). id는 경로 조각이 될 수 있는 글자만 받는다.
const BAG_ROUTE_STORAGE_PATH =
  /^bags\/([A-Za-z0-9_-]+)\/routes\/([A-Za-z0-9_-]+)\.gpx$/;

/**
 * 오프라인 저장 파일 경로 (OF-1 · §4). 경로 규칙을 한 곳에 둔다 — 저장·읽기·정리·GPX 내보내기가
 * 같은 경로를 봐야 한다.
 */
class OfflineTripFiles {
  public static getRoot(): Directory {
    return new Directory(Paths.document, ROOT_DIRECTORY);
  }

  public static getTripDirectory(bagId: string): Directory {
    return new Directory(Paths.document, ROOT_DIRECTORY, bagId);
  }

  public static getTempDirectory(bagId: string): Directory {
    return new Directory(
      Paths.document,
      ROOT_DIRECTORY,
      `${bagId}${TEMP_SUFFIX}`
    );
  }

  public static getTempName(bagId: string): string {
    return `${bagId}${TEMP_SUFFIX}`;
  }

  public static getBackupDirectory(bagId: string): Directory {
    return new Directory(
      Paths.document,
      ROOT_DIRECTORY,
      OfflineTripFiles.getBackupName(bagId)
    );
  }

  public static getBackupName(bagId: string): string {
    return `${bagId}${BACKUP_SUFFIX}`;
  }

  /**
   * 갱신 도중 앱이 꺼져 저장본 자리가 비고 비켜 둔 기존 저장본(`.old`)만 남았으면 되돌린다(§6).
   * 되돌리지 못해도 던지지 않는다.
   */
  public static restoreBackupIfMissing(bagId: string): void {
    try {
      const backup = OfflineTripFiles.getBackupDirectory(bagId);

      if (!OfflineTripFiles.getTripDirectory(bagId).exists && backup.exists) {
        backup.rename(bagId);
      }
    } catch (error) {
      console.warn('[OfflineTripFiles] 저장본 되돌리기 실패', error); // l10n-ignore: 개발자 로그
    }
  }

  /**
   * 다 쓴 임시 디렉터리로 저장본 자리를 바꾼다(OF-2). 기존 저장본을 `.old`로 비키고 → tmp를 제자리로 →
   * `.old`를 지운다. tmp를 옮기지 못하면 `.old`를 되돌리고 던진다 — 기존 저장본이 그대로 남는다.
   */
  public static replaceTripDirectory(
    bagId: string,
    tempDirectory: Directory
  ): void {
    OfflineTripFiles.deleteQuietly(OfflineTripFiles.getBackupDirectory(bagId));

    const current = OfflineTripFiles.getTripDirectory(bagId);
    const hadCurrent = current.exists;

    if (hadCurrent) {
      current.rename(OfflineTripFiles.getBackupName(bagId));
    }

    try {
      tempDirectory.rename(bagId);
    } catch (error) {
      if (hadCurrent) {
        OfflineTripFiles.restoreBackupIfMissing(bagId);
      }

      throw error;
    }

    OfflineTripFiles.deleteQuietly(OfflineTripFiles.getBackupDirectory(bagId));
  }

  public static getSnapshotFile(directory: Directory): File {
    return new File(directory, SNAPSHOT_FILE);
  }

  public static getRoutesDirectory(directory: Directory): Directory {
    return new Directory(directory, ROUTES_DIRECTORY);
  }

  public static getRouteFile(directory: Directory, routeId: string): File {
    return new File(directory, ROUTES_DIRECTORY, `${routeId}${GPX_EXTENSION}`);
  }

  // 코스 원본 경로 → 저장해 둔 GPX 파일(OF-6 GPX 내보내기). 저장하지 않았으면 `null`.
  public static findRouteFileByStoragePath(storagePath: string): File | null {
    const match = BAG_ROUTE_STORAGE_PATH.exec(storagePath);

    if (!match) {
      return null;
    }

    const file = OfflineTripFiles.getRouteFile(
      OfflineTripFiles.getTripDirectory(match[1]),
      match[2]
    );

    return file.exists ? file : null;
  }

  // 남은 공간(바이트). 읽지 못하면 `null` — 그때는 쓰기 실패로 판단한다.
  public static getAvailableDiskSpace(): number | null {
    try {
      const space = Paths.availableDiskSpace;

      return Number.isFinite(space) ? space : null;
    } catch {
      return null;
    }
  }

  // 디렉터리를 지운다. 없거나 지우지 못해도 던지지 않는다(정리 경로는 실패해도 화면을 막지 않는다).
  public static deleteQuietly(directory: Directory): void {
    try {
      if (directory.exists) {
        directory.delete();
      }
    } catch (error) {
      console.warn('[OfflineTripFiles] 디렉터리 삭제 실패', error); // l10n-ignore: 개발자 로그
    }
  }
}

export default OfflineTripFiles;
