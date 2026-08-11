import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  documentId,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import GearFilter from '../gear/GearFilter';
import Gear, { GearExtra, toGearExtra } from '../gear/Gear';

export interface GearRankData {
  id: string;
  name: string;
  company: string;
  weight: string;
  count: number;
  category: string;
  updatedAt: Date;
  useless: string[];
  used: string[];
  bags: string[];
  createDate: number;
  color: string;
  companyKorean: string;
  nameKorean: string;
  extra: GearExtra;
}

/** 순위 한 칸 — 장비와 그 장비를 담은 횟수(`gear-rank.count`, DM-6). */
export interface RankedGear {
  gear: Gear;
  count: number;
}

class GearRankStore {
  public constructor(private readonly firebase: Firebase) {}

  public async loadRanking(
    category: GearFilter = GearFilter.All
  ): Promise<GearRankData[]> {
    try {
      const rankQuery =
        category === GearFilter.All
          ? query(
              collection(this.firebase.getStore(), 'gear-rank'),
              orderBy('count', 'desc'),
              limit(10)
            )
          : query(
              collection(this.firebase.getStore(), 'gear-rank'),
              where('category', '==', category),
              orderBy('count', 'desc'),
              limit(10)
            );

      const snapshot = await getDocs(rankQuery);

      // gearId 목록 수집
      const gearIds = snapshot.docs.map(d => d.data().id);

      if (gearIds.length === 0) {
        return [];
      }

      // 한 번에 모든 gear 문서 가져오기
      const gearsQuery = query(
        collection(this.firebase.getStore(), 'gear'),
        where(documentId(), 'in', gearIds)
      );
      const gearsSnapshot = await getDocs(gearsQuery);

      // Map으로 변환하여 O(1) 조회
      const gearsMap = new Map(gearsSnapshot.docs.map(d => [d.id, d.data()]));

      // gear-rank 데이터와 함께 실제 장비 정보도 가져오기
      const data: GearRankData[] = [];

      for (const rankDoc of snapshot.docs) {
        const rankData = rankDoc.data();
        const gearId = rankData.id;
        const gearData = gearsMap.get(gearId);

        if (gearData) {
          data.push({
            id: gearId,
            name: gearData.name || gearId,
            company: gearData.company || '',
            weight: gearData.weight || '',
            count: rankData.count,
            category: rankData.category,
            updatedAt: rankData.updatedAt?.toDate() || new Date(),
            useless: gearData.useless || [],
            used: gearData.used || [],
            bags: gearData.bags || [],
            createDate: Date.now(),
            color: gearData.color || '',
            companyKorean: gearData.companyKorean || '',
            nameKorean: gearData.nameKorean || '',
            // 인기 장비는 카탈로그(`gear`) 문서라 imageUrl은 크롤 이미지다 — 읽지 않는다(DataModel §1).
            extra: toGearExtra(gearData),
          });
        } else {
          // gears에 없으면 ID만 표시
          data.push({
            id: gearId,
            name: gearId,
            company: '',
            weight: '',
            count: rankData.count,
            category: rankData.category,
            updatedAt: rankData.updatedAt?.toDate() || new Date(),
            useless: [],
            used: [],
            bags: [],
            createDate: Date.now(),
            color: '',
            companyKorean: '',
            nameKorean: '',
            extra: {},
          });
        }
      }

      return data;
    } catch (error) {
      console.error('Error loading gear ranking:', error);
      return [];
    }
  }

  /**
   * 순위 목록을 **담은 횟수와 함께** 넘긴다.
   *
   * `Gear`에는 count 자리가 없어(카탈로그 장비 모델이라 순위 지표를 들지 않는다) 화면이 쓸
   * 수 있도록 짝을 만들어 준다 — 순위 화면이 왜 이 순서인지 보여주지 못하면 임의 목록으로
   * 읽힌다(SR-4). 순서는 `convertToGears`가 입력 배열을 그대로 map하므로 보존된다.
   */
  public async loadRankedGears(
    category: GearFilter = GearFilter.All
  ): Promise<RankedGear[]> {
    const rankData = await this.loadRanking(category);
    const gears = await this.convertToGears(rankData);

    return gears.map((gear, index) => ({
      gear,
      count: rankData[index]?.count ?? 0,
    }));
  }

  private async convertToGears(data: GearRankData[]): Promise<Gear[]> {
    const myGears = await this.getMyGears();

    return data.map(item => {
      const isAdded = this.hasGear(item.id, myGears);
      return new Gear(
        item.id,
        item.name,
        item.company,
        item.weight,
        isAdded,
        false,
        item.category,
        item.useless,
        item.used,
        item.bags,
        item.createDate,
        item.color,
        item.companyKorean,
        item.nameKorean,
        item.extra
      );
    });
  }

  private async getMyGears(): Promise<Gear[]> {
    if (!this.firebase.isLoggedIn()) {
      return [];
    }

    try {
      const gearsRef = collection(
        this.firebase.getStore(),
        'users',
        this.firebase.getUserId(),
        'gears'
      );
      const snapshot = await getDocs(gearsRef);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return new Gear(
          data.id,
          data.name,
          data.company,
          data.weight,
          true,
          data.isCustom,
          data.category,
          data.useless || [],
          data.used || [],
          data.bags || [],
          data.createDate,
          data.color || '',
          data.companyKorean || '',
          data.nameKorean || '',
          // 여기서 만든 Gear는 `hasGear` 보유 여부 판정에만 쓰이고 화면에 도달하지 않는다
          // (`convertToGears`는 순위 데이터의 extra를 쓴다) — extra는 소비되지 않으므로
          // 기본형으로 둔다.
          toGearExtra(data)
        );
      });
    } catch (error) {
      console.error('Error loading my gears:', error);
      return [];
    }
  }

  private hasGear(id: string, myGears: Gear[]): boolean {
    return myGears.some(myGear => myGear.hasId(id));
  }
}

export default GearRankStore;
