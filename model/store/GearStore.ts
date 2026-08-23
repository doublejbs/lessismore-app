import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import Gear, { toGearExtra, toOwnerGearExtra } from '../gear/Gear';
import { getGroupMembers } from '../gear/GearCategoryGroups';
import {
  addDoc,
  arrayRemove,
  deleteDoc,
  deleteField,
  orderBy,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  increment,
} from '@firebase/firestore';
import GearFilter from '../gear/GearFilter';
import OrderType from '../order/OrderType';
import { moveUnweightedLast } from '../order/WeightOrder';
import { toBrandKey } from './BrandKey';
import { ReviewCache } from '../review/ReviewTypes';

export interface GearData {
  id: string;
  name: string;
  company: string;
  weight: string;
  isCustom: boolean;
  category: string;
  useless: string[];
  used: string[];
  bags: string[];
  createDate: number;
  color: string;
  companyKorean: string;
  nameKorean: string;
  // 문서 경로에 따라 의미가 다르다(DM-3): 사용자 문서는 본인 업로드 사진, 카탈로그는 크롤 이미지.
  imageUrl?: string;
  coupangUrl?: string;
  // 브랜드 공식몰 상품 페이지(DM-3). 카탈로그에만 있고 사용자 사본엔 복사하지 않는다.
  productUrl?: string;
  // productUrl 페이지의 og:image(브랜드 CDN 절대 URL, DM-3). 미리보기 카드(GD-5a) 전용.
  // 처음 그 장비를 연 클라이언트가 채운다 — 백필로 미리 모아두지 않는다.
  productImageUrl?: string;
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
  groupId?: string;
  specs?: Record<string, string | number | boolean>;
}

/** 카탈로그 장비의 외부 링크 묶음(GD-5). 값이 없으면 키를 생략한다. */
export interface GearExternalLinks {
  coupangUrl?: string;
  productUrl?: string;
  /** 미리보기 카드용 og:image(GD-5a). 아직 수집 전이면 없다. */
  productImageUrl?: string;
}

class GearStore {
  // 외부 링크(coupangUrl·productUrl)는 /gear 문서에만 있어 카드 마운트마다 getDoc이 반복된다.
  // 동일 id 재요청 시 Firestore를 다시 읽지 않도록 결과와 in-flight Promise를 캐시한다.
  // **두 링크를 한 번의 읽기로 함께 가져온다**(GD-5) — 링크가 늘었다고 조회가 늘면 안 된다.
  private readonly externalLinksCache = new Map<string, GearExternalLinks>();

  private readonly externalLinksInFlight = new Map<
    string,
    Promise<GearExternalLinks>
  >();

  public constructor(private readonly firebase: Firebase) {}

  public async getGear(id: string): Promise<Gear> {
    const userGear = await this.getUserGear(id);

    if (userGear) {
      return userGear;
    } else {
      const docData = await getDoc(doc(this.getStore(), 'gear', id));

      if (docData.exists()) {
        const data = docData.data() as GearData;
        const {
          name,
          company,
          weight,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean,
        } = data;
        const isAdded = await this.hasGear(id);

        return new Gear(
          id,
          name,
          company,
          weight,
          isAdded,
          isCustom,
          category,
          useless,
          used,
          bags,
          isAdded ? createDate : Date.now(),
          color,
          companyKorean,
          nameKorean,
          // 카탈로그(`gear/{id}`) 문서라 imageUrl은 크롤 이미지다 — 읽지 않는다(DataModel §1, DM-3).
          toGearExtra(data)
        );
      } else {
        throw Error('No Gear data found.');
      }
    }
  }

  // 카탈로그 경로(`/gear/{id}`)만 조회한다. 운영자 콘텐츠의 참조 조인은 사용자 창고
  // 사본보다 카탈로그 원본을 우선해야 하므로 `getGear`와 분리한다(Home HM-12).
  public async getCatalogGear(id: string): Promise<Gear | null> {
    const snapshot = await getDoc(doc(this.getStore(), 'gear', id));

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as GearData;
    const {
      name,
      company,
      weight,
      isCustom,
      category,
      useless,
      used,
      bags,
      createDate,
      color,
      companyKorean,
      nameKorean,
    } = data;
    const isAdded = await this.hasGear(id);

    return new Gear(
      id,
      name,
      company,
      weight,
      isAdded,
      isCustom,
      category,
      useless,
      used,
      bags,
      isAdded ? createDate : Date.now(),
      color,
      companyKorean,
      nameKorean,
      toGearExtra(data)
    );
  }

  public async getUserGear(id: string) {
    if (this.getUserId()) {
      const docData = await getDoc(
        doc(this.getStore(), 'users', this.getUserId(), 'gears', id)
      );

      if (docData.exists()) {
        const data = docData.data() as GearData;
        const {
          name,
          company,
          weight,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean,
        } = data;

        return new Gear(
          id,
          name,
          company,
          weight,
          true,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean,
          // 본인이 보는 본인 창고 문서다 — imageUrl을 읽는다(GD-13). 단 사용자 문서라는
          // 사실만으로는 본인 사진임이 보장되지 않아 Storage 경로로 한 번 더 거른다(§1).
          toOwnerGearExtra(data, this.getUserId())
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  public async hasGear(id: string): Promise<boolean> {
    if (this.getUserId()) {
      const docData = await getDoc(
        doc(this.getStore(), 'users', this.getUserId(), 'gears', id)
      );
      return docData.exists();
    } else {
      return false;
    }
  }

  public async getList(
    filters: GearFilter[],
    order: OrderType
  ): Promise<Gear[]> {
    // 그룹 필터는 세분 카테고리 멤버 배열로 확장해 쿼리한다(DM-4 — 레거시 그룹 키 포함).
    const categoryKeys = filters.flatMap(filter => getGroupMembers(filter));

    const filterQuery =
      filters.length === 1 && filters[0] === GearFilter.All
        ? query(
            collection(this.getStore(), 'users', this.getUserId(), 'gears'),
            this.getOrderQuery(order)
          )
        : query(
            collection(this.getStore(), 'users', this.getUserId(), 'gears'),
            where('category', 'in', categoryKeys),
            this.getOrderQuery(order)
          );
    const gears = (await getDocs(filterQuery)).docs.map(doc => {
      const data = doc.data();
      const {
        id,
        name,
        company,
        weight,
        isCustom,
        category,
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
        nameKorean,
      } = data;

      return new Gear(
        id,
        name,
        company,
        weight,
        true,
        isCustom,
        category,
        useless,
        used,
        bags,
        createDate,
        color,
        companyKorean,
        nameKorean,
        // 본인이 보는 본인 창고 목록이라 imageUrl을 읽는다 — 창고 행 썸네일(WH-1, GD-13).
        // 크롤 URL이 복사돼 남은 문서는 Storage 경로 판별에서 걸러진다(§1).
        toOwnerGearExtra(data, this.getUserId())
      );
    });

    return moveUnweightedLast(gears, order, gear => gear.getWeight());
  }

  private getOrderQuery(order: OrderType) {
    switch (order) {
      case OrderType.NameAsc:
        return orderBy('name', 'asc');
      case OrderType.NameDesc:
        return orderBy('name', 'desc');
      case OrderType.WeightAsc:
        return orderBy('weight', 'asc');
      case OrderType.WeightDesc:
        return orderBy('weight', 'desc');
      case OrderType.CreatedAsc:
        return orderBy('createDate', 'asc');
      case OrderType.CreatedDesc:
        return orderBy('createDate', 'desc');
      default:
        return orderBy('name', 'asc');
    }
  }

  public async register(value: Gear[]) {
    try {
      const batch = writeBatch(this.getStore());

      for (const gear of value) {
        const gearRef = doc(
          this.getStore(),
          'users',
          this.getUserId(),
          'gears',
          gear.getId()
        );

        const gearExists = (await getDoc(gearRef)).exists();

        if (gearExists) {
          // 이미 존재하면 스킵
        } else {
          // 사용자 gears에 추가
          batch.set(gearRef, gear.getData());

          // isCustom이 false인 경우 gear-rank 업데이트
          if (!gear.getIsCustom()) {
            const gearRankRef = doc(this.getStore(), 'gear-rank', gear.getId());
            const gearRankDoc = await getDoc(gearRankRef);

            if (gearRankDoc.exists()) {
              // 이미 존재하면 count만 증가
              batch.update(gearRankRef, {
                count: increment(1),
                updatedAt: new Date(),
              });
            } else {
              // 존재하지 않으면 새로 생성 — gear-rank.category는 GearFilter 값 계약(DM-6)이라
              // 세분 카테고리를 그룹 키로 정규화해 저장한다.
              batch.set(gearRankRef, {
                id: gear.getId(),
                count: 1,
                category: gear.getGroupCategory(),
                updatedAt: new Date(),
              });
            }

            // brand-rank ownerCount 업데이트
            const companyKorean = gear.getCompanyKorean();
            const company = gear.getCompany();
            const brandKey = toBrandKey(companyKorean, company);

            if (brandKey) {
              const brandRankRef = doc(this.getStore(), 'brand-rank', brandKey);
              const brandRankDoc = await getDoc(brandRankRef);

              if (brandRankDoc.exists()) {
                batch.update(brandRankRef, {
                  ownerCount: increment(1),
                  updatedAt: new Date(),
                });
              } else {
                batch.set(brandRankRef, {
                  brandKey,
                  companyKorean,
                  company,
                  ownerCount: 1,
                  updatedAt: new Date(),
                });
              }
            }
          }
        }
      }

      await batch.commit();
    } catch (e) {
      console.log(e);
    }
  }

  public async update(gear: Gear) {
    try {
      const gearRef = doc(
        this.getStore(),
        'users',
        this.getUserId(),
        'gears',
        gear.getId()
      );
      // 부분 갱신(merge)으로 쓴다 — 전체 덮어쓰기는 `Gear.getData()` 페이로드에 없는 필드를
      // 전부 지운다. 실제로 이 경로로 imageUrl이 유실됐고, 크롤 파이프라인이 넣는
      // specs·groupId 등 앱이 모델에 담지 않는 필드도 같은 위험에 있다(DM-11).
      await setDoc(gearRef, gear.getData(), { merge: true });
    } catch (error) {
      console.error('Error updating gear:', error);
    }
  }

  /**
   * 장비 사진 URL 저장 (GD-13). Storage 업로드가 성공한 뒤에만 호출한다.
   * 부분 갱신이라 다른 필드는 건드리지 않는다(DM-11).
   * 실패는 삼키지 않는다 — 호출부가 토스트로 알리고 기존 상태를 유지해야 한다.
   */
  public async saveImageUrl(gearId: string, imageUrl: string): Promise<void> {
    await updateDoc(this.getUserGearRef(gearId), { imageUrl });
  }

  /**
   * 장비 사진 제거 (GD-13).
   * merge 쓰기에서 **키 누락은 삭제가 아니므로** `deleteField()`로 명시 제거해야 한다 —
   * `Gear.getData()`는 값이 없으면 키를 빼기만 해 문서의 옛 값이 남는다(DM-11).
   * 이전 Storage 파일 삭제(DM-9)는 호출부가 GearImageStorage와 조합한다.
   */
  public async removeImageUrl(gearId: string): Promise<void> {
    await updateDoc(this.getUserGearRef(gearId), { imageUrl: deleteField() });
  }

  // 사용자 문서 참조를 만드는 단일 지점. userId가 비면 Firestore는 `users//gears/{id}`라는
  // 잘못된 경로로 조용히 실패하므로(빈 세그먼트) 여기서 명확한 에러로 끊는다 —
  // `GearImageStorage.uploadImage`의 로그인 가드와 같은 기준이다(GD-13).
  private getUserGearRef(gearId: string) {
    const userId = this.getUserId();

    if (!userId) {
      throw new Error('로그인해야 장비 사진을 저장할 수 있습니다.'); // l10n-ignore: 호출부가 공통 번역 토스트로 치환
    }

    return doc(this.getStore(), 'users', userId, 'gears', gearId);
  }

  public async updateGears(gears: Gear[]) {
    const batch = writeBatch(this.getStore());
    for (const gear of gears) {
      const gearRef = doc(
        this.getStore(),
        'users',
        this.getUserId(),
        'gears',
        gear.getId()
      );
      batch.update(gearRef, gear.getData());
    }
    await batch.commit();
  }

  public async remove(gear: Gear) {
    try {
      const gearRef = doc(
        this.getStore(),
        'users',
        this.getUserId(),
        'gears',
        gear.getId()
      );
      const gearSnap = await getDoc(gearRef);

      if (!gearSnap.exists()) {
        console.error('Gear does not exist:', gear.getId());
        return;
      }

      const { bags, weight } = gearSnap.data() as GearData;
      const batch = writeBatch(this.getStore());

      for (const bagId of bags) {
        const bagRef = doc(this.getStore(), 'bag', bagId);
        const bagSnap = await getDoc(bagRef);

        if (bagSnap.exists()) {
          const bagData = bagSnap.data();
          const newWeight = Math.max(0, (bagData.weight || 0) - +weight);

          batch.update(bagRef, {
            weight: newWeight,
            gears: arrayRemove(gear.getId()),
          });
        }
      }

      // isCustom이 false인 경우 gear-rank 업데이트
      if (!gear.getIsCustom()) {
        const gearRankRef = doc(this.getStore(), 'gear-rank', gear.getId());
        const gearRankDoc = await getDoc(gearRankRef);

        if (gearRankDoc.exists()) {
          const currentCount = gearRankDoc.data().count || 0;

          if (currentCount <= 1) {
            // count가 1 이하면 문서 삭제
            batch.delete(gearRankRef);
          } else {
            // count 감소
            batch.update(gearRankRef, {
              count: increment(-1),
              updatedAt: new Date(),
            });
          }
        }

        // brand-rank ownerCount 업데이트
        const brandKey = toBrandKey(
          gear.getCompanyKorean(),
          gear.getCompany()
        );

        if (brandKey) {
          const brandRankRef = doc(this.getStore(), 'brand-rank', brandKey);
          const brandRankDoc = await getDoc(brandRankRef);

          if (brandRankDoc.exists()) {
            const currentOwnerCount = brandRankDoc.data().ownerCount || 0;

            if (currentOwnerCount <= 1) {
              batch.delete(brandRankRef);
            } else {
              batch.update(brandRankRef, {
                ownerCount: increment(-1),
                updatedAt: new Date(),
              });
            }
          }
        }
      }

      await batch.commit();
      await deleteDoc(gearRef);
    } catch (error) {
      console.error('Error deleting gear:', error);
    }
  }

  public async getExternalLinks(id: string): Promise<GearExternalLinks> {
    const cached = this.externalLinksCache.get(id);

    if (cached) {
      return cached;
    }

    const inFlight = this.externalLinksInFlight.get(id);

    if (inFlight) {
      return inFlight;
    }

    const request = this.fetchExternalLinks(id);

    this.externalLinksInFlight.set(id, request);

    try {
      const links = await request;

      this.externalLinksCache.set(id, links);

      return links;
    } finally {
      this.externalLinksInFlight.delete(id);
    }
  }

  /**
   * 처음 수집한 미리보기 이미지 URL을 카탈로그 문서에 남긴다(GD-5a).
   *
   * 다음 조회부터는 `getExternalLinks`에 함께 실려 와 추가 요청이 사라진다.
   * 실패는 조용히 무시한다 — 화면은 이미 이미지를 그린 뒤다.
   */
  public async saveProductImageUrl(id: string, productImageUrl: string) {
    try {
      await updateDoc(doc(this.getStore(), 'gear', id), { productImageUrl });

      const cached = this.externalLinksCache.get(id);

      if (cached) {
        this.externalLinksCache.set(id, { ...cached, productImageUrl });
      }
    } catch {
      // 권한·네트워크 실패는 무시한다. 다음 진입에서 다시 시도된다.
    }
  }

  private async fetchExternalLinks(id: string): Promise<GearExternalLinks> {
    try {
      const docData = await getDoc(doc(this.getStore(), 'gear', id));

      if (!docData.exists()) {
        return {};
      }

      const { coupangUrl, productUrl, productImageUrl } =
        docData.data() as GearData;

      // 빈 문자열은 값이 없는 것으로 본다 — 크롤 문서에 ''가 섞여 있으면 빈 행이 그려진다.
      return {
        ...(coupangUrl ? { coupangUrl } : {}),
        ...(productUrl ? { productUrl } : {}),
        ...(productImageUrl ? { productImageUrl } : {}),
      };
    } catch {
      return {};
    }
  }

  // 장비 외부 후기 공유 캐시 조회 (GearDetail GD-6, DataModel DM-19). 문서가 없으면 null.
  public async getReviewCache(gearId: string): Promise<ReviewCache | null> {
    const snapshot = await getDoc(doc(this.getStore(), 'gear-review', gearId));

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as ReviewCache;
  }

  // 장비 외부 후기 공유 캐시 갱신 (DM-19). 문서 통째 덮어쓰기 — 두 소스 모두
  // 조회에 성공한 결과만 저장해야 한다(실패로 캐시를 오염시키지 않기, 호출측 책임).
  public async saveReviewCache(
    gearId: string,
    cache: ReviewCache
  ): Promise<void> {
    await setDoc(doc(this.getStore(), 'gear-review', gearId), cache);
  }

  private getStore() {
    return this.firebase.getStore();
  }

  private getUserId() {
    return this.firebase.getUserId();
  }

  public async add(value: Gear) {
    await addDoc(collection(this.getStore(), 'gear'), value.getData());
  }
}

export default GearStore;
