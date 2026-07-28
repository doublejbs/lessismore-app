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

  public async loadRankingAsGears(
    category: GearFilter = GearFilter.All
  ): Promise<Gear[]> {
    const rankData = await this.loadRanking(category);
    return this.convertToGears(rankData);
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
