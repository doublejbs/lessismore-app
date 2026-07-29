import { makeAutoObservable, runInAction } from 'mobx';
import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagStore from '@/model/store/BagStore';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';

// 공유 배낭(다녀온 배낭) 읽기전용 뷰어 도메인(CS-8).
// 소유자의 장비 구성을 편집·패킹 없이 열람만 한다.
interface SharedBagData {
  name: string;
  startDate: string;
  endDate: string;
  weight: number;
  gears: Gear[];
}

class SharedBag {
  private initialized = false;
  // 공유가 해제됐거나(getSharedBag throw) 문서가 없을 때 true.
  private notShared = false;
  private bag: SharedBagData | null = null;

  public constructor(private readonly bagStore: BagStore) {
    makeAutoObservable(this);
  }

  public static new() {
    return new SharedBag(app.getBagStore()!);
  }

  public async initialize(id: string) {
    try {
      const result = await this.bagStore.getSharedBag(id, [GearFilter.All]);

      runInAction(() => {
        if (result) {
          this.bag = {
            name: result.name,
            startDate: result.startDate,
            endDate: result.endDate,
            weight: result.weight,
            gears: result.gears,
          };
        } else {
          this.notShared = true;
        }
      });
    } catch {
      // 공유 해제/미공유 배낭 — getSharedBag 내부에서 throw한다.
      runInAction(() => {
        this.notShared = true;
      });
    } finally {
      runInAction(() => {
        this.initialized = true;
      });
    }
  }

  public isInitialized() {
    return this.initialized;
  }

  public isNotShared() {
    return this.notShared;
  }

  public getName() {
    return this.bag?.name ?? '';
  }

  public getGears(): Gear[] {
    return this.bag?.gears ?? [];
  }

  public getDateRange(): string {
    if (!this.bag) {
      return '';
    }

    const start = dayjs(this.bag.startDate).format('YYYY.MM.DD');
    const end = dayjs(this.bag.endDate).format('YYYY.MM.DD');

    return `${start} ~ ${end}`;
  }

  public getTotalWeightLabel(): string {
    const weight = this.bag?.weight ?? 0;

    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(2)}kg`;
    }

    return `${weight}g`;
  }
}

export default SharedBag;
