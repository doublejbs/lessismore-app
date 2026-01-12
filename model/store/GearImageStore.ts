import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import GearImageType from '../gear/GearImageType';

class GearImageStore {
  public constructor(private readonly firebase: Firebase) {}

  /**
   * 특정 장비의 공유 이미지 목록 조회
   * Firestore: /gear/{gearId}/images
   */
  public async getImages(gearId: string): Promise<GearImageType[]> {
    try {
      const imagesRef = collection(this.getStore(), 'gear', gearId, 'images');
      const q = query(imagesRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as GearImageType
      );
    } catch (error) {
      console.error('Error getting gear images:', error);
      return [];
    }
  }

  /**
   * 새 공유 이미지 추가
   */
  public async addImage(
    gearId: string,
    imageId: string,
    url: string,
    uploaderName?: string
  ): Promise<void> {
    try {
      const imageRef = doc(this.getStore(), 'gear', gearId, 'images', imageId);
      const userId = this.getUserId();

      await setDoc(imageRef, {
        id: imageId,
        url,
        uploadedBy: userId,
        uploadedAt: Date.now(),
        uploaderName: uploaderName || null,
      });
    } catch (error) {
      console.error('Error adding gear image:', error);
      throw error;
    }
  }

  /**
   * 이미지 삭제 (본인 이미지만)
   */
  public async deleteImage(gearId: string, imageId: string): Promise<void> {
    try {
      const imageRef = doc(this.getStore(), 'gear', gearId, 'images', imageId);
      await deleteDoc(imageRef);
    } catch (error) {
      console.error('Error deleting gear image:', error);
      throw error;
    }
  }

  /**
   * 이미지 수 조회
   */
  public async getImageCount(gearId: string): Promise<number> {
    try {
      const imagesRef = collection(this.getStore(), 'gear', gearId, 'images');
      const snapshot = await getDocs(imagesRef);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting gear image count:', error);
      return 0;
    }
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserId() {
    return this.firebase.getUserId();
  }
}

export default GearImageStore;
