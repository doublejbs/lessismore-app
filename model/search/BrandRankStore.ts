import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';

export interface BrandRankData {
  brandKey: string;
  companyKorean: string;
  company: string;
  ownerCount: number;
  gearCount?: number;
}

class BrandRankStore {
  public constructor(private readonly firebase: Firebase) {}

  public async loadBrands(max: number = 200): Promise<BrandRankData[]> {
    try {
      const brandQuery = query(
        collection(this.firebase.getStore(), 'brand-rank'),
        orderBy('ownerCount', 'desc'),
        limit(max)
      );

      const snapshot = await getDocs(brandQuery);

      return snapshot.docs.map(doc => {
        const data = doc.data();

        const brand: BrandRankData = {
          brandKey: data.brandKey || doc.id,
          companyKorean: data.companyKorean || '',
          company: data.company || '',
          ownerCount: data.ownerCount || 0,
        };

        if (typeof data.gearCount === 'number') {
          brand.gearCount = data.gearCount;
        }

        return brand;
      });
    } catch (error) {
      console.error('Error loading brand ranking:', error);

      return [];
    }
  }
}

export default BrandRankStore;
