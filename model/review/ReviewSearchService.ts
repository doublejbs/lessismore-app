import { BlogReview, ReviewSearchRequest, VideoReview } from './ReviewTypes';
import { matchesRequiredTokens } from './ReviewRelevance';

// 외부 후기 검색(공용): 네이버 블로그 검색 + 유튜브 검색으로 검색어의 상위 결과를 조회한다.
// 박지 상세(CS-3)와 장비 상세(GD-6)가 함께 쓴다 — 검색어와 필수 토큰은 호출측이 조립한다.
// 반환 규약: 조회 성공 시 배열(0건이면 빈 배열), 키 미설정·조회 실패면 null.
// null/배열 구분은 Firestore 공유 캐시(DM-18/19) 갱신 판단에 쓰인다 — 실패를 캐시에 저장하지 않기 위함.
const BLOG_SEARCH_URL = 'https://openapi.naver.com/v1/search/blog.json';
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
// 관련성 필터로 걸러진 뒤에도 표시 건수를 채우려면 후보를 넉넉히 받아야 한다.
// 유튜브 search.list는 maxResults와 무관하게 호출당 100유닛이라 후보 확대에 쿼터 추가 비용이 없다(CS-3).
const BLOG_CANDIDATE_COUNT = 30;
const VIDEO_CANDIDATE_COUNT = 25;
const BLOG_DISPLAY_COUNT = 5;
const VIDEO_DISPLAY_COUNT = 4;

const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID;
const CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

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

const getBlogReviews = async ({
  query,
  requiredTokens,
}: ReviewSearchRequest): Promise<BlogReview[] | null> => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return null;
  }

  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const encoded = encodeURIComponent(trimmed);
    const url = `${BLOG_SEARCH_URL}?query=${encoded}&display=${BLOG_CANDIDATE_COUNT}`;
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
      },
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const items: BlogSearchItem[] = json?.items ?? [];

    // 관련성 판정은 HTML을 제거한 제목으로 한다 — 원문에는 검색어 강조 <b> 태그가 섞여 있다.
    return items
      .filter(item => Boolean(item.link))
      .map(item => ({
        title: stripHtml(item.title ?? ''),
        summary: stripHtml(item.description ?? ''),
        bloggerName: stripHtml(item.bloggername ?? ''),
        postDate: formatPostDate(item.postdate),
        link: item.link ?? '',
      }))
      .filter(review => matchesRequiredTokens(review.title, requiredTokens))
      .slice(0, BLOG_DISPLAY_COUNT);
  } catch (e) {
    console.error('블로그 후기 조회 실패:', e); // l10n-ignore

    return null;
  }
};

const getVideoReviews = async ({
  query,
  requiredTokens,
}: ReviewSearchRequest): Promise<VideoReview[] | null> => {
  if (!YOUTUBE_API_KEY) {
    return null;
  }

  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const encoded = encodeURIComponent(trimmed);
    // regionCode 기본값이 US라 한국어 후기와 무관한 영어권 결과가 섞인다 — KR/ko를 명시한다(CS-3).
    const url = `${YOUTUBE_SEARCH_URL}?part=snippet&type=video&maxResults=${VIDEO_CANDIDATE_COUNT}&relevanceLanguage=ko&regionCode=KR&q=${encoded}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const items: YoutubeSearchItem[] = json?.items ?? [];

    // 유튜브 제목은 &amp;#39; 처럼 이중 인코딩으로 오므로 판정 전에 stripHtml로 풀어 둔다.
    return items
      .filter(item => Boolean(item.id?.videoId))
      .map(item => ({
        videoId: item.id?.videoId ?? '',
        title: stripHtml(item.snippet?.title ?? ''),
        channelName: stripHtml(item.snippet?.channelTitle ?? ''),
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? '',
      }))
      .filter(video => matchesRequiredTokens(video.title, requiredTokens))
      .slice(0, VIDEO_DISPLAY_COUNT);
  } catch (e) {
    console.error('후기 영상 조회 실패:', e); // l10n-ignore

    return null;
  }
};

const reviewSearchService = { getBlogReviews, getVideoReviews };

export default reviewSearchService;
