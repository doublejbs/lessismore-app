import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import Gear, { toGearExtra } from '../gear/Gear';
import { getGroupMembers } from '../gear/GearCategoryGroups';
import {
  addDoc,
  arrayRemove,
  deleteDoc,
  orderBy,
  setDoc,
  where,
  writeBatch,
  increment,
} from '@firebase/firestore';
import GearFilter from '../gear/GearFilter';
import OrderType from '../order/OrderType';
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
  coupangUrl?: string;
  colorKorean?: string;
  size?: string;
  sizeKorean?: string;
  groupId?: string;
  specs?: Record<string, string | number | boolean>;
}

class GearStore {
  // coupangUrl은 /gear 문서에만 있어 카드 마운트마다 getDoc이 반복된다.
  // 동일 id 재요청 시 Firestore를 다시 읽지 않도록 결과와 in-flight Promise를 캐시한다.
  private readonly coupangUrlCache = new Map<string, string | undefined>();

  private readonly coupangUrlInFlight = new Map<
    string,
    Promise<string | undefined>
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
          toGearExtra(data)
        );
      } else {
        throw Error('No Gear data found.');
      }
    }
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
          toGearExtra(data)
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
    const gears = (await getDocs(filterQuery)).docs;

    if (!!gears?.length) {
      return gears.map(doc => {
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
          toGearExtra(data)
        );
      });
    } else {
      return [];
    }
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
      await setDoc(gearRef, gear.getData());
    } catch (error) {
      console.error('Error updating gear:', error);
    }
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

  public async getCoupangUrl(id: string): Promise<string | undefined> {
    if (this.coupangUrlCache.has(id)) {
      return this.coupangUrlCache.get(id);
    }

    const inFlight = this.coupangUrlInFlight.get(id);

    if (inFlight) {
      return inFlight;
    }

    const request = this.fetchCoupangUrl(id);

    this.coupangUrlInFlight.set(id, request);

    try {
      const coupangUrl = await request;

      this.coupangUrlCache.set(id, coupangUrl);

      return coupangUrl;
    } finally {
      this.coupangUrlInFlight.delete(id);
    }
  }

  private async fetchCoupangUrl(id: string): Promise<string | undefined> {
    try {
      const docData = await getDoc(doc(this.getStore(), 'gear', id));

      if (docData.exists()) {
        const { coupangUrl } = docData.data() as GearData;

        return coupangUrl;
      } else {
        return undefined;
      }
    } catch {
      return undefined;
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
