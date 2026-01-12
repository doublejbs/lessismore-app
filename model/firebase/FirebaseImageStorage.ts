import {
  FirebaseStorage,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import app from '@/model/app/App';

// React Native에서 사용하는 이미지 파일 타입
interface ImageFile {
  uri: string;
  name: string;
  type: string;
}

class FirebaseImageStorage {
  public static new() {
    const firebase = app.getFirebase();

    return new FirebaseImageStorage(
      firebase.getStorage(),
      firebase.getUserId()
    );
  }

  private constructor(
    private readonly storage: FirebaseStorage,
    private readonly userId: string
  ) {}

  public async uploadFile(file: ImageFile | File, fileName: string) {
    const storageRef = ref(this.storage, `/${this.userId}/${fileName}`);

    // React Native의 경우 URI에서 Blob을 생성
    if ('uri' in file) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
    } else {
      // 웹의 경우 기존 방식 사용
      await uploadBytes(storageRef, file);
    }

    return await getDownloadURL(storageRef);
  }

  public async uploadFileToPublic(file: ImageFile | File, fileName: string) {
    const storageRef = ref(this.storage, `gears/${fileName}`);

    // React Native의 경우 URI에서 Blob을 생성
    if ('uri' in file) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
    } else {
      // 웹의 경우 기존 방식 사용
      await uploadBytes(storageRef, file);
    }

    return await getDownloadURL(storageRef);
  }

  /**
   * 장비 공유 이미지 업로드
   * Storage 경로: /gears/{gearId}/{imageId}
   */
  public async uploadGearSharedImage(
    file: ImageFile | File,
    gearId: string,
    imageId: string
  ) {
    const storageRef = ref(this.storage, `gears/${gearId}/${imageId}`);

    // React Native의 경우 URI에서 Blob을 생성
    if ('uri' in file) {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
    } else {
      // 웹의 경우 기존 방식 사용
      await uploadBytes(storageRef, file);
    }

    return await getDownloadURL(storageRef);
  }
}

export default FirebaseImageStorage;
