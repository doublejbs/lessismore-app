import Gear from '@/model/gear/Gear';
import app from '@/model/app/App';
import GearStore from '@/model/store/GearStore';
import BagStore from '@/model/store/BagStore';

class GearEditDispatcher {
  public static new() {
    return new GearEditDispatcher(app.getGearStore()!, app.getBagStore()!);
  }

  private constructor(
    private readonly gearStore: GearStore,
    private readonly bagStore: BagStore
  ) {}

  public async getGear(id: string): Promise<Gear> {
    return await this.gearStore.getGear(id);
  }

  public async update(gear: Gear) {
    await this.gearStore.update(gear);
  }

  public async updateBagWeight(bags: string[], gear: Gear) {
    if (bags.length) {
      await this.bagStore.updateBagsWeight(bags, Number(gear.getWeight()));
    }
  }
}

export default GearEditDispatcher;
