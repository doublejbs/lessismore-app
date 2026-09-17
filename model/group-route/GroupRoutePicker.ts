import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import GpxParseError from './GpxParseError';
import GpxParseErrorType from './GpxParseErrorType';

// 사용자가 고른 GPX 한 개. 파싱·업로드가 함께 보는 값만 담는다.
export interface GroupRoutePickedFile {
  uri: string;
  // 확장자를 포함한 원본 파일명. 트랙 이름이 없을 때 코스 이름으로 쓴다.
  name: string;
  size: number;
}

const GPX_EXTENSION = '.gpx';

/**
 * GPX 파일 선택 (GRP-8).
 *
 * **웹에서는 제공하지 않는다**(APP-5) — 웹은 그룹 지도도 목록으로 대체하는 화면이라
 * 올린 코스를 볼 수단이 없고, 파일 선택만 여는 것은 반쪽짜리 경로다.
 */
class GroupRoutePicker {
  public static isSupported(): boolean {
    return Platform.OS !== 'web';
  }

  /**
   * 파일 선택기를 연다. 취소하면 `null`이고 화면은 조용히 끝낸다.
   *
   * MIME 필터를 `.gpx` 한 종류로 좁히지 않는 이유는, GPX에 표준으로 등록된 MIME이 없어
   * 기기마다 `application/gpx+xml`·`application/octet-stream`·`text/xml`로 제각각 잡히고,
   * 필터를 걸면 사용자가 **자기 파일을 고를 수조차 없게** 되기 때문이다. 대신 고른 뒤
   * 확장자로 거른다 — 받는 것은 `.gpx`뿐이라는 계약은 그대로다.
   */
  public static async pick(): Promise<GroupRoutePickedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];

    if (!asset) {
      return null;
    }

    const name = asset.name ?? '';

    if (!name.toLowerCase().endsWith(GPX_EXTENSION)) {
      throw new GpxParseError(GpxParseErrorType.Invalid);
    }

    return {
      uri: asset.uri,
      name,
      size:
        asset.size && asset.size > 0
          ? asset.size
          : GroupRoutePicker.measureSize(asset.uri),
    };
  }

  public static async readText(uri: string): Promise<string> {
    try {
      return await new File(uri).text();
    } catch {
      // 일부 `content://` URI는 expo-file-system File로 열리지 않는다(커뮤니티 사진과 같은 폴백).
      const response = await fetch(uri);

      return await response.text();
    }
  }

  /**
   * 선택기가 크기를 안 줄 때가 있다. 파일에서 직접 잰다.
   * 그래도 못 재면 **0 = 크기 미상**이다(`content://` 등). 검증 단계가 이 0을 "너무 크다"가 아니라
   * "읽지 못했다"로 본다 — `GpxParser.validateFileSize` 참고.
   */
  private static measureSize(uri: string): number {
    try {
      const size = new File(uri).size;

      return Number.isFinite(size) && size > 0 ? size : 0;
    } catch {
      return 0;
    }
  }
}

export default GroupRoutePicker;
