/**
 * 커뮤니티 공개 사진의 업로드 결과 모델이다(CM-6, DM-9, DM-28).
 * 공개 UGC는 개인 장비 사진 경로와 분리된 전용 Storage 경로를 사용한다.
 */
interface CommunityUploadedImage {
  id: string;
  url: string;
  storagePath: string;
  width: number;
  height: number;
}

export default CommunityUploadedImage;
