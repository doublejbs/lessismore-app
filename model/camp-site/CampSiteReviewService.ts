import { CampSiteReview, CampSiteVideo } from './CampSiteReviewTypes';

// 박지 후기(CS-3): 네이버 블로그 검색 + 유튜브 검색으로 "{박지명} 백패킹" 상위 결과를 조회한다.
// 소스별로 키 미설정·조회 실패·0건이면 조용히 빈 배열을 반환한다(해당 리스트만 생략, 두 소스 모두 0건이면 후기 섹션 자체 생략).
const BLOG_SEARCH_URL = 'https://openapi.naver.com/v1/search/blog.json';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const SEARCH_KEYWORD = '백패킹';
const BLOG_DISPLAY_COUNT = 5;
const VIDEO_MAX_RESULTS = 4;

const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID;
const CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

// 박지별 세션 캐시: 검색 쿼터 절약 + 상세 재진입 시 재조회 방지(CS-3).
// 성공 응답만 캐시하며(0건 포함), 실패는 캐시하지 않아 재시도를 허용한다.
const reviewCache = new Map<string, CampSiteReview[]>();
const videoCache = new Map<string, CampSiteVideo[]>();

// 네이버 블로그 검색 응답의 개별 아이템 형태(필요한 필드만).
interface BlogSearchItem {
  title?: string;
  description?: string;
  link?: string;
  bloggername?: string;
  postdate?: string;
}

// 유튜브 검색(search.list) 응답의 개별 아이템 형태(필요한 필드만).
interface YoutubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: {
        url?: string;
      };
    };
  };
}

// 제목/요약에 포함된 HTML 엔티티 → 원문 문자 매핑.
const HTML_ENTITY: Record<string, string> = {
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#39;': "'",
};

// HTML 태그(<b> 등)와 엔티티를 제거해 표시용 순수 텍스트로 만든다.
// 유튜브는 &amp;#39; 처럼 이중 인코딩으로 오므로 &amp; 를 먼저 풀어 &#39; 로 만든 뒤 다시 푼다.
const stripHtml = (text: string): string => {
  const withoutTags = text.replace(/<[^>]*>/g, '');

  let result = withoutTags;

  for (const [entity, char] of Object.entries(HTML_ENTITY)) {
    result = result.split(entity).join(char);
  }

  return result.trim();
};

// postdate(YYYYMMDD) → 표시용 YYYY.MM.DD. 형식이 어긋나면 원문을 그대로 둔다.
const formatPostDate = (postdate: string | undefined): string => {
  if (!postdate || !/^\d{8}$/.test(postdate)) {
    return postdate ?? '';
  }

  const year = postdate.slice(0, 4);
  const month = postdate.slice(4, 6);
  const day = postdate.slice(6, 8);

  return `${year}.${month}.${day}`;
};

// "{박지명} 백패킹" 검색어.
const buildQuery = (spotName: string): string => {
  return `${spotName} ${SEARCH_KEYWORD}`;
};

const getReviews = async (spotName: string): Promise<CampSiteReview[]> => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return [];
  }

  const trimmed = spotName.trim();

  if (!trimmed) {
    return [];
  }

  const cached = reviewCache.get(trimmed);

  if (cached) {
    return cached;
  }

  try {
    const query = encodeURIComponent(buildQuery(trimmed));
    const url = `${BLOG_SEARCH_URL}?query=${query}&display=${BLOG_DISPLAY_COUNT}`;
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
      },
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const items: BlogSearchItem[] = json?.items ?? [];
    const reviews = items
      .filter(item => Boolean(item.link))
      .map(item => ({
        title: stripHtml(item.title ?? ''),
        summary: stripHtml(item.description ?? ''),
        bloggerName: stripHtml(item.bloggername ?? ''),
        postDate: formatPostDate(item.postdate),
        link: item.link ?? '',
      }));

    reviewCache.set(trimmed, reviews);

    return reviews;
  } catch (e) {
    console.error('박지 후기 조회 실패:', e);

    return [];
  }
};

const getVideos = async (spotName: string): Promise<CampSiteVideo[]> => {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  const trimmed = spotName.trim();

  if (!trimmed) {
    return [];
  }

  const cached = videoCache.get(trimmed);

  if (cached) {
    return cached;
  }

  try {
    const query = encodeURIComponent(buildQuery(trimmed));
    const url = `${YOUTUBE_SEARCH_URL}?part=snippet&type=video&maxResults=${VIDEO_MAX_RESULTS}&q=${query}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const items: YoutubeSearchItem[] = json?.items ?? [];
    const videos = items
      .filter(item => Boolean(item.id?.videoId))
      .map(item => ({
        videoId: item.id?.videoId ?? '',
        title: stripHtml(item.snippet?.title ?? ''),
        channelName: stripHtml(item.snippet?.channelTitle ?? ''),
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? '',
      }));

    videoCache.set(trimmed, videos);

    return videos;
  } catch (e) {
    console.error('박지 후기 영상 조회 실패:', e);

    return [];
  }
};

const campSiteReviewService = { getReviews, getVideos };

export default campSiteReviewService;
