import { Platform } from 'react-native';
import GearStore from '../store/GearStore';

/**
 * 브랜드 링크 미리보기 이미지(GD-5a) — **처음 열릴 때 가져오고, 가져온 URL을 저장한다.**
 *
 * 미리 전량을 수집해두지 않는다. 사람들이 실제로 여는 장비만 채워지고, 한 번 채워지면
 * 그 뒤로는 `gear/{id}` 문서를 읽을 때 함께 딸려와 **조회 시점 추가 요청이 0**이 된다.
 * (장비 상세는 어차피 그 문서를 한 번 읽는다 — 쿠팡·브랜드 링크 때문에.)
 *
 * 결과적으로 브랜드 서버는 **상품당 사실상 1회**만 맞는다. 매 조회마다 긁는 방식은
 * 조회수만큼 때리게 되고, 그쪽이 저작권보다 실질적인 민폐다.
 */

/** 응답 대기 상한. 미리보기는 부가 정보라 오래 기다릴 이유가 없다. */
const TIMEOUT_MS = 8000;

/**
 * 미리보기를 그리지 않을 호스트.
 *
 * 브랜드가 이의를 제기하거나 Referer 차단을 걸면 여기에 추가하고 **OTA로 내보낸다**
 * (`npm run hotupdate`) — 스토어 심사 없이 몇 분이면 반영된다. Firestore 원격 설정으로
 * 두는 안도 있었지만, 보안 규칙을 함께 열어야 하고 규칙이 없으면 조용히 무력해진다.
 */
const BLOCKED_HOSTS: readonly string[] = [];

/**
 * 상품 사진이 아니라 **사이트 공용 로고**를 og:image로 주는 곳들.
 *
 * 시에라디자인은 상품 637건이 전부 같은 `og.jpg`(사이트 로고)를 반환한다 — 그대로 그리면
 * 미리보기가 없느니만 못하다. 새로 발견되면 여기에 추가한다.
 */
const GENERIC_IMAGES: readonly string[] = [
  'https://sierra-designs.co.kr/layout/basic/img/asset/og.jpg',
];

const getHost = (url: string): string | null => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
};

/** HTML에서 og:image를 뽑아 절대 URL로 만든다. 못 찾으면 null. */
const extractOgImage = (html: string, pageUrl: string): string | null => {
  const patterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  ];

  for (const pattern of patterns) {
    const found = pattern.exec(html)?.[1]?.trim();

    if (found) {
      try {
        return new URL(found, pageUrl).toString();
      } catch {
        return null;
      }
    }
  }

  return null;
};

class GearPreviewStore {
  public static new(gearStore: GearStore) {
    return new GearPreviewStore(gearStore);
  }

  private readonly cache = new Map<string, string>();
  // 실패한 장비를 다시 시도하지 않는다 — 죽은 링크가 27% 가량이라 재시도가 곧 낭비다.
  private readonly attempted = new Set<string>();

  private constructor(private readonly gearStore: GearStore) {}

  public isHostAllowed(productUrl: string | undefined): boolean {
    if (!productUrl) {
      return false;
    }

    const host = getHost(productUrl);

    return Boolean(host) && !BLOCKED_HOSTS.includes(host as string);
  }

  /**
   * 저장된 값이 없을 때 상품 페이지에서 og:image를 한 번 긁어 온다.
   *
   * **웹에서는 하지 않는다** — 남의 사이트 HTML을 읽는 건 CORS가 막는다. 대신 네이티브가
   * 채워 둔 값을 웹도 그대로 받아 쓰므로, 시간이 지날수록 웹 커버리지도 따라 올라간다.
   */
  public async load(
    gearId: string,
    productUrl: string
  ): Promise<string | undefined> {
    if (!this.isHostAllowed(productUrl)) {
      return undefined;
    }

    const cached = this.cache.get(gearId);

    if (cached) {
      return cached;
    }

    if (Platform.OS === 'web' || this.attempted.has(gearId)) {
      return undefined;
    }

    this.attempted.add(gearId);

    const imageUrl = await this.fetchOgImage(productUrl);

    if (!imageUrl || GENERIC_IMAGES.includes(imageUrl)) {
      return undefined;
    }

    this.cache.set(gearId, imageUrl);
    // 다음 조회부터는 장비 문서에 실려 오도록 남긴다. 실패해도 화면에는 영향이 없다.
    void this.gearStore.saveProductImageUrl(gearId, imageUrl);

    return imageUrl;
  }

  private async fetchOgImage(pageUrl: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(pageUrl, { signal: controller.signal });

      if (!response.ok) {
        return null;
      }

      return extractOgImage(await response.text(), response.url || pageUrl);
    } catch {
      // 타임아웃·네트워크 실패는 조용히 넘긴다 — 미리보기 없이도 카드는 정상이다.
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export default GearPreviewStore;
