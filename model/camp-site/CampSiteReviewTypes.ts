// 박지 후기(네이버 블로그) 표시용 형태 (CampSite CS-3 후기 링크).
export interface CampSiteReview {
  title: string;
  summary: string; // description에서 HTML 제거한 요약(2줄 노출)
  bloggerName: string;
  postDate: string; // 표시용으로 정규화한 값(YYYY.MM.DD)
  link: string;
}

// 박지 후기 영상(유튜브) 표시용 형태 (CampSite CS-3 후기 영상 리스트).
export interface CampSiteVideo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}
