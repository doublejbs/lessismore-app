import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import Firebase from './Firebase';
import { isOwnGearImageUrl } from '../gear-image/GearImageOwnership';

// 이미 지워진 파일에 deleteObject를 부르면 SDK가 이 코드로 실패한다.
const OBJECT_NOT_FOUND_CODE = 'storage/object-not-found';

// 앨범·카메라 결과의 blob type이 비어 있을 때 쓸 기본값. 피커를 quality 0.8로 돌려
// JPEG로 받으므로(GearImageUpload) 이 값이 실제와 어긋나지 않는다.
const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';

/**
 * 개인 장비 사진 전용 Storage 접근자 (DM-9, GD-13).
 *
 * 쓰기 경로는 **본인 폴더(`/{userId}/{fileName}`) 하나뿐**이다. 카탈로그 크롤 이미지
 * (`/gears/{fileName}`)와 폐기된 공유 갤러리(`/gears/{gearId}/{imageId}`)는 다루지 않는다 —
 * 갤러리는 재도입하지 않는 재유포 경로다(DataModel §1).
 */
class GearImageStorage {
  public static from(firebase: Firebase) {
    return new GearImageStorage(firebase);
  }

  private constructor(private readonly firebase: Firebase) {}

  /**
   * 로컬 파일 URI(앨범·카메라 선택 결과)를 본인 폴더에 올리고 다운로드 URL을 돌려준다.
   *
   * 실패는 **삼키지 않고 그대로 던진다** — 호출부가 토스트로 알리고 기존 상태를 유지해야
   * 하며, 업로드 성공 후에만 문서를 갱신해 깨진 URL이 저장되는 걸 막는다(GD-13).
   */
  public async uploadImage(localUri: string): Promise<string> {
    const userId = this.firebase.getUserId();

    if (!userId) {
      throw new Error('로그인해야 장비 사진을 올릴 수 있습니다.');
    }

    const storageRef = ref(
      this.firebase.getStorage(),
      `/${userId}/${this.createFileName()}`
    );
    const blob = await this.fetchBlob(localUri);

    // contentType을 넘기지 않으면 Storage가 application/octet-stream으로 저장·서빙해
    // 일부 환경에서 이미지로 렌더되지 않고 다운로드로 처리된다.
    await uploadBytes(storageRef, blob, {
      contentType: blob.type || DEFAULT_IMAGE_CONTENT_TYPE,
    });

    return await getDownloadURL(storageRef);
  }

  /**
   * 다운로드 URL이 가리키는 파일을 지운다(교체·삭제 시 이전 파일 정리, DM-9).
   *
   * **본인 폴더(`/{userId}/`)의 파일만 지운다.** 2026-07-28 이전 `GearStore.register()`가
   * 카탈로그 문서를 통째로 복사해 저장한 탓에, 사용자 문서의 `imageUrl`이 전 사용자가
   * 공유하는 크롤 이미지(`gears/{fileName}`, 42,369개)를 가리키고 있을 수 있다. 그걸 지우면
   * 모든 사용자·향후 브랜드 제휴용 자산이 함께 사라지고 회수 경로가 없다(DataModel §1, DM-9).
   * 소유 경로가 아니면 아무것도 하지 않고 성공으로 돌아간다 — 이 함수의 목적은 "내 파일 정리"라
   * 지울 내 파일이 없으면 할 일이 끝난 것이다.
   *
   * 이미 없는 파일도 **성공으로 취급한다** — 2024~2026 업로드분에는 참조가 끊긴 URL이
   * 섞여 있어(DataModel §1), 여기서 실패로 처리하면 사진을 지울 수 없게 된다.
   */
  public async deleteImage(downloadUrl: string): Promise<void> {
    if (!isOwnGearImageUrl(downloadUrl, this.firebase.getUserId())) {
      return;
    }

    try {
      await deleteObject(ref(this.firebase.getStorage(), downloadUrl));
    } catch (error) {
      if ((error as { code?: string }).code === OBJECT_NOT_FOUND_CODE) {
        return;
      }

      throw error;
    }
  }

  // 같은 사용자가 연속 업로드해도 겹치지 않게 시각 + 난수를 조합한다.
  private createFileName(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }

  // React Native의 로컬 URI(file://, ph://, content://)는 uploadBytes에 바로 못 넘긴다 —
  // fetch로 읽어 Blob으로 바꾼다. 웹의 blob: URI도 같은 경로로 처리된다.
  private async fetchBlob(localUri: string): Promise<Blob> {
    const response = await fetch(localUri);

    // fetch는 실패 응답에 reject하지 않는다 — 여기서 걸러야 0바이트 파일이 올라가고
    // 그 깨진 URL이 문서에 저장되는 걸 막을 수 있다(GD-13).
    // 단 status 0은 실패가 아니다: RN에서 file://·content:// 같은 로컬 URI는 HTTP 응답이
    // 아니라 네이티브 URI 핸들러가 처리해 상태 코드를 주지 않는데, 그게 곧 정상 경로다.
    if (!response.ok && response.status !== 0) {
      throw new Error(
        `사진 파일을 읽지 못했습니다 (status ${response.status})`
      );
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('사진 파일이 비어 있습니다.');
    }

    return blob;
  }
}

export default GearImageStorage;
