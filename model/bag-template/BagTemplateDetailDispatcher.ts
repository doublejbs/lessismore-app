import Gear from '@/model/gear/Gear';
import BagTemplate from '@/model/bag/BagTemplate';
import BagTemplateStore from '@/model/store/BagTemplateStore';
import app from '@/model/app/App';

// 템플릿 상세(BT-4)의 Firestore 접근을 도메인에서 분리한다.
class BagTemplateDetailDispatcher {
  public static new() {
    return new BagTemplateDetailDispatcher(app.getBagTemplateStore()!);
  }

  private constructor(private readonly store: BagTemplateStore) {}

  public async get(id: string) {
    return await this.store.getEditData(id);
  }

  public async updateName(id: string, name: string) {
    await this.store.updateName(id, name);
  }

  public async updateGears(id: string, gears: Gear[]) {
    await this.store.updateGears(id, gears);
  }

  public async getTemplate(id: string): Promise<BagTemplate | null> {
    return await this.store.get(id);
  }
}

export default BagTemplateDetailDispatcher;
