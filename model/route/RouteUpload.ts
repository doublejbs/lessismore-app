import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import type Firebase from '@/model/firebase/Firebase';

// GPX는 텍스트 XML이지만 브라우저·OS가 코스 파일로 알아보는 전용 타입이 있다.
const GPX_CONTENT_TYPE = 'application/gpx+xml';
const OBJECT_NOT_FOUND_CODE = 'storage/object-not-found';

/**
 * 코스 원본(GPX)의 Storage 보관 (GRP-8, BD-11, DM-29·DM-30).
 *
 * 경로(`groups/{groupId}/routes/{routeId}.gpx` · `bags/{bagId}/routes/{routeId}.gpx`)는
 * 각 스토어가 발급하고, 여기서는 **이미 정해진 경로**에 올리고 지우는 일만 한다 —
 * 그래서 그룹·배낭이 같은 업로더를 쓴다. 업로드와 Firestore 쓰기를 잇는 순서(고아 파일 회수
 * 포함)는 각 디스패처가 맡는다.
 */
class RouteUpload {
  public static from(firebase: Firebase) {
    return new RouteUpload(firebase);
  }

  private constructor(private readonly firebase: Firebase) {}

  /**
   * 사용자가 고른 파일을 **원본 바이트 그대로** 올린다.
   * 파싱에 쓴 문자열을 다시 Blob으로 만들지 않는 이유는, 그 문자열이 UTF-8로 해석한 결과라
   * 다른 인코딩으로 쓰인 GPX를 되돌려 쓰면 원본이 바뀌기 때문이다.
   */
  public async upload(storagePath: string, localUri: string): Promise<void> {
    const blob = await RouteUpload.fetchBlob(localUri);

    await uploadBytes(ref(this.firebase.getStorage(), storagePath), blob, {
      contentType: GPX_CONTENT_TYPE,
    });
  }

  /**
   * 올려 둔 원본을 다시 읽기 위한 다운로드 URL (BD-11 `그룹에 올리기`).
   * 배낭 코스를 그룹에 **복사**할 때, 원본 바이트를 그대로 받아 그룹 경로에 다시 올린다 —
   * 파싱 결과(축약 좌표)만 복사하면 그룹 코스의 원본 GPX가 없는 상태가 된다.
   */
  public getDownloadUrl(storagePath: string): Promise<string> {
    return getDownloadURL(ref(this.firebase.getStorage(), storagePath));
  }

  // 이미 없는 파일을 지우는 것은 실패가 아니다 — 회수 경로에서도 같은 판단을 쓴다.
  public async delete(storagePath: string): Promise<void> {
    try {
      await deleteObject(ref(this.firebase.getStorage(), storagePath));
    } catch (error) {
      if ((error as { code?: string }).code === OBJECT_NOT_FOUND_CODE) {
        return;
      }

      throw error;
    }
  }

  private static async fetchBlob(localUri: string): Promise<Blob> {
    const response = await fetch(localUri);

    // `file://` 응답은 status 0으로 오므로 0을 실패로 보지 않는다(커뮤니티 사진 업로드와 같다).
    if (!response.ok && response.status !== 0) {
      throw new Error(`GPX fetch failed with status ${response.status}`);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('GPX file is empty');
    }

    return blob;
  }
}

export default RouteUpload;
