import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import Gear from '../gear/Gear';
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

export interface GearData {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
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
}

class GearStore {
  public constructor(private readonly firebase: Firebase) {}

  public async getGear(id: string): Promise<Gear> {
    const userGear = await this.getUserGear(id);

    if (userGear) {
      return userGear;
    } else {
      const docData = await getDoc(doc(this.getStore(), 'gear', id));

      if (docData.exists()) {
        const {
          name,
          company,
          weight,
          imageUrl,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean,
        } = docData.data() as GearData;
        const isAdded = await this.hasGear(id);

        return new Gear(
          id,
          name,
          company,
          weight,
          imageUrl,
          isAdded,
          isCustom,
          category,
          useless,
          used,
          bags,
          isAdded ? createDate : Date.now(),
          color,
          companyKorean,
          nameKorean
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
        const {
          name,
          company,
          weight,
          imageUrl,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean,
        } = docData.data() as GearData;

        return new Gear(
          id,
          name,
          company,
          weight,
          imageUrl,
          true,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean
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
    const filterQuery =
      filters.length === 1 && filters[0] === GearFilter.All
        ? query(
            collection(this.getStore(), 'users', this.getUserId(), 'gears'),
            this.getOrderQuery(order)
          )
        : query(
            collection(this.getStore(), 'users', this.getUserId(), 'gears'),
            where('category', 'in', filters),
            this.getOrderQuery(order)
          );
    const gears = (await getDocs(filterQuery)).docs;

    if (!!gears?.length) {
      return gears.map(doc => {
        const {
          id,
          name,
          company,
          weight,
          imageUrl,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean,
        } = doc.data();

        return new Gear(
          id,
          name,
          company,
          weight,
          imageUrl,
          true,
          isCustom,
          category,
          useless,
          used,
          bags,
          createDate,
          color,
          companyKorean,
          nameKorean
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
              // 존재하지 않으면 새로 생성
              batch.set(gearRankRef, {
                id: gear.getId(),
                count: 1,
                category: gear.getCategory(),
                updatedAt: new Date(),
              });
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
      }

      await batch.commit();
      await deleteDoc(gearRef);
    } catch (error) {
      console.error('Error deleting gear:', error);
    }
  }

  public async getCoupangUrl(id: string): Promise<string | undefined> {
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
