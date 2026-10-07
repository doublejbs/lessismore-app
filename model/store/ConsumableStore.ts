import { makeAutoObservable } from 'mobx';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import ConsumableCategory from '../consumable/ConsumableCategory';
import { ConsumableProduct } from '../consumable/ConsumableProduct';
import ConsumableSurface from '../consumable/ConsumableSurface';

const COLLECTION_NAME = 'consumable-product';
const CATEGORIES = new Set<string>(Object.values(ConsumableCategory));
const SURFACES = new Set<string>(Object.values(ConsumableSurface));

// 운영자 큐레이션 소모품 조회·공유 (Consumables CP-1, DataModel DM-32).
// 배낭 상세·홈·커뮤니티 세 자리가 이 싱글톤 결과 하나를 함께 읽는다 — 자리마다 따로 조회하지 않는다.
// store/ 계층은 보통 무상태지만, 세 화면이 같은 결과를 반응형으로 공유해야 해서 observable로 둔다.
class ConsumableStore {
  private products: ConsumableProduct[] = [];
  private loaded = false;
  // 세션당 1회 조회를 보장하는 in-flight/완료 Promise. 관찰 대상이 아니다.
  private loadPromise: Promise<void> | null = null;
  // refresh가 겹칠 때 늦게 끝난 옛 요청이 새 결과를 덮지 않게 하는 순번.
  private requestSeq = 0;

  public constructor(private readonly firebase: Firebase) {
    makeAutoObservable<ConsumableStore, 'firebase' | 'loadPromise' | 'requestSeq'>(
      this,
      { firebase: false, loadPromise: false, requestSeq: false },
      { autoBind: true }
    );
  }

  // 세션당 1회 조회(CP-1). 여러 자리에서 불러도 같은 Promise를 돌려준다.
  public load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.fetch();
    }

    return this.loadPromise;
  }

  // 홈 당겨서 새로고침(CP-5) — 다시 읽고 결과를 세 자리에 함께 반영한다.
  public refresh(): Promise<void> {
    this.loadPromise = this.fetch();

    return this.loadPromise;
  }

  public getIsLoaded(): boolean {
    return this.loaded;
  }

  // 자리 필터 + order 정렬 결과 전체. 개수 상한(CONSUMABLE_CAROUSEL_MAX 등)은 호출하는 쪽이 건다.
  public getForSurface(surface: ConsumableSurface): ConsumableProduct[] {
    return this.products.filter(product => product.surfaces.includes(surface));
  }

  private async fetch(): Promise<void> {
    this.requestSeq += 1;

    const seq = this.requestSeq;
    const products = await this.readPublished();

    if (seq !== this.requestSeq) {
      return;
    }

    this.setProducts(products);
    this.setLoaded(true);
  }

  // published 등치 하나만 서버에 건다 — order 정렬까지 걸면 복합 색인이 필요하다(DM-32).
  // 실패는 화면을 막지 않도록 빈 목록으로 숨기고 개발자 로그만 남긴다(CP-1).
  private async readPublished(): Promise<ConsumableProduct[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(this.firebase.getStore(), COLLECTION_NAME),
          where('published', '==', true)
        )
      );

      return snapshot.docs
        .map(document =>
          ConsumableStore.normalize(
            document.id,
            document.data() as Record<string, unknown>
          )
        )
        .filter((product): product is ConsumableProduct => product !== null)
        .sort(ConsumableStore.compare);
    } catch (error) {
      console.warn('소모품 조회 실패:', error); // l10n-ignore: 개발자 로그

      return [];
    }
  }

  // order 오름차순, 동률은 문서 id 오름차순(CP-1).
  private static compare(a: ConsumableProduct, b: ConsumableProduct): number {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    if (a.id === b.id) {
      return 0;
    }

    return a.id < b.id ? -1 : 1;
  }

  // 운영 데이터가 계약을 어겨도 카드가 깨지지 않게 필수 값이 없는 문서는 버린다.
  private static normalize(
    id: string,
    data: Record<string, unknown>
  ): ConsumableProduct | null {
    const name = ConsumableStore.getTrimmedString(data.name);
    const coupangUrl = ConsumableStore.getTrimmedString(data.coupangUrl);

    if (!name || !coupangUrl || !coupangUrl.startsWith('https://')) {
      return null;
    }

    const imageUrl = ConsumableStore.getTrimmedString(data.imageUrl);
    const category = ConsumableStore.getTrimmedString(data.category);
    const surfaces = Array.isArray(data.surfaces)
      ? data.surfaces.filter(
          (surface): surface is ConsumableSurface =>
            typeof surface === 'string' && SURFACES.has(surface)
        )
      : [];

    return {
      id,
      name,
      pitch: ConsumableStore.getTrimmedString(data.pitch) ?? '',
      category:
        category && CATEGORIES.has(category)
          ? (category as ConsumableCategory)
          : ConsumableCategory.Etc,
      coupangUrl,
      // ATS가 막는 HTTP 이미지는 밴드로 들이지 않는다 — 아이콘 폴백(CP-2).
      ...(imageUrl?.startsWith('https://') ? { imageUrl } : {}),
      productId: ConsumableStore.getTrimmedString(data.productId) ?? id,
      surfaces,
      order:
        typeof data.order === 'number' && Number.isFinite(data.order)
          ? data.order
          : Number.MAX_SAFE_INTEGER,
      published: true,
    };
  }

  private static getTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed || null;
  }

  private setProducts(value: ConsumableProduct[]) {
    this.products = value;
  }

  private setLoaded(value: boolean) {
    this.loaded = value;
  }
}

export default ConsumableStore;
