import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import app from '@/model/app/App';
import RouteUpload from '@/model/route/RouteUpload';
import ToastManager from '@/model/toast/ToastManager';

// 내보낼 코스. 그룹 코스·배낭 코스가 모두 원본 경로를 들고 있다(DM-29·DM-30).
export interface RouteExportTarget {
  getName(): string;
  getStoragePath(): string;
}

// 받아 둔 원본. `null`이면 받지 못했다 — 실패 알림은 메뉴 시트가 내려간 뒤에 띄운다.
export type RouteExportFile = { uri: string; name: string } | null;

const GPX_MIME_TYPE = 'application/gpx+xml';
// iOS가 GPX로 알아보는 UTI. 공유 시트가 지도 앱 열기를 제안하는 근거다.
const GPX_UTI = 'com.topografix.gpx';
const GPX_EXTENSION = '.gpx';
// 이름이 비거나 쓸 수 없는 문자뿐일 때의 파일명.
const FALLBACK_FILE_NAME = 'GPX';
// 파일 시스템의 이름 상한(255바이트)을 한글(3바이트)로도 넘지 않게 글자 수를 자른다.
const MAX_FILE_NAME_LENGTH = 80;
// 앱 캐시 아래 내보내기 전용 폴더. 내보낼 때마다 비우고 새로 받는다(GRP-8).
const EXPORT_DIRECTORY = 'route-export';
// 파일명에 쓸 수 없는 문자(Windows·macOS·Android 공통)와 제어 문자.
const INVALID_FILE_NAME_CHARS = /[/\\:*?"<>|\u0000-\u001F\u007F]/g;
const GPX_EXTENSION_PATTERN = /\.gpx$/i;

/**
 * 코스 GPX 내보내기 (GRP-8 `GPX 내려받기`, BD-11).
 *
 * Storage의 **원본 GPX를 그대로** 받아 기기 공유 시트로 넘긴다 — 축약 좌표로 다시 만들지 않는다
 * (트랙포인트 전체·고도·시간이 있어야 다른 앱에서 쓸 수 있다). 화면에서 뒤집어 보고 있어도
 * 원본 방향 그대로다(뒤집기는 이 기기의 보기 설정이다).
 *
 * 받기(`download`)와 넘기기(`share`)를 나눈 이유는, 받는 동안은 메뉴 시트를 띄운 채 진행을
 * 보여 주고 공유 시트·실패 토스트는 메뉴 시트가 내려간 **뒤에** 열어야 해서다 — 모달 위에서는
 * 토스트가 가려진다. 권한은 Storage 규칙이 그대로 가른다(그룹원·배낭 소유자).
 *
 * 웹은 지도·코스 관리 화면이 없어 제공하지 않는다(APP-5).
 */
class RouteExport {
  public static isSupported(): boolean {
    return Platform.OS !== 'web';
  }

  public static new() {
    return new RouteExport(
      RouteUpload.from(app.getFirebase()),
      app.getToastManager()!
    );
  }

  /**
   * `{코스 이름}.gpx`. 파일명에 쓸 수 없는 문자는 `_`로 바꾸고, 이름이 이미 `.gpx`로 끝나면
   * 확장자를 겹쳐 붙이지 않는다. 남는 것이 없으면 `GPX.gpx`다.
   */
  public static toFileName(routeName: string): string {
    const base = routeName
      .replace(INVALID_FILE_NAME_CHARS, '_')
      .trim()
      .replace(GPX_EXTENSION_PATTERN, '')
      // 앞의 점은 숨김 파일이 된다.
      .replace(/^\.+/, '')
      .trim()
      .slice(0, MAX_FILE_NAME_LENGTH)
      .trim();

    return `${base || FALLBACK_FILE_NAME}${GPX_EXTENSION}`;
  }

  private constructor(
    private readonly upload: RouteUpload,
    private readonly toastManager: ToastManager
  ) {}

  /**
   * 원본을 앱 캐시의 내보내기 폴더로 받는다. 폴더를 먼저 비워 지난번 파일(이름이 다른 코스 포함)을
   * 남기지 않는다. 실패하면 `null` — 사용자에게 알리는 일은 `share`가 한다.
   */
  public async download(target: RouteExportTarget): Promise<RouteExportFile> {
    const storagePath = target.getStoragePath();

    if (!storagePath) {
      return null;
    }

    try {
      const url = await this.upload.getDownloadUrl(storagePath);
      const directory = RouteExport.prepareDirectory();
      const name = RouteExport.toFileName(target.getName());
      const file = await File.downloadFileAsync(
        url,
        new File(directory, name),
        { idempotent: true }
      );

      return { uri: file.uri, name };
    } catch (error) {
      console.error('GPX 내보내기 다운로드 실패:', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  /**
   * 받은 파일을 공유 시트로 넘긴다. 공유 시트를 닫는 것(취소)은 실패가 아니라 알리지 않는다.
   * 받지 못했거나 이 기기에서 공유를 쓸 수 없으면 `GPX를 받지 못했어요`.
   */
  public async share(file: RouteExportFile): Promise<void> {
    if (!file) {
      this.showFailure();

      return;
    }

    try {
      if (!(await Sharing.isAvailableAsync())) {
        this.showFailure();

        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: GPX_MIME_TYPE,
        UTI: GPX_UTI,
        dialogTitle: file.name,
      });
    } catch (error) {
      console.error('GPX 내보내기 공유 실패:', error); // l10n-ignore: 개발자 로그
      this.showFailure();
    }
  }

  private showFailure() {
    this.toastManager.show({ message: app.getL10n().t('route.exportFailed') });
  }

  private static prepareDirectory(): Directory {
    const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);

    if (directory.exists) {
      directory.delete();
    }

    directory.create({ intermediates: true, idempotent: true });

    return directory;
  }
}

export default RouteExport;
