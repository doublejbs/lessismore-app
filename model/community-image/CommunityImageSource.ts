/**
 * 커뮤니티 사진의 입력 출처다(CM-6, DM-9, DM-28).
 * 커뮤니티 공개 사진은 개인 장비 사진 경로와 분리해 처리한다.
 */
enum CommunityImageSource {
  Album = 'album',
  Camera = 'camera',
}

export default CommunityImageSource;
