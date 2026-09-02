import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import { CommunityBagSnapshot } from './CommunityData';

class CommunityBagSnapshotBuilder {
  public static build(bag: BagItem, gears: Gear[]): CommunityBagSnapshot {
    return new CommunityBagSnapshotBuilder().build(bag, gears);
  }

  public build(bag: BagItem, gears: Gear[]): CommunityBagSnapshot {
    const snapshot: CommunityBagSnapshot = {
      name: bag.getName(),
      totalWeight: bag.getWeightGram(),
      itemCount: bag.getGearCount(),
      gears: gears.map(gear => ({
        company: gear.getCompanyKorean() || gear.getCompany(),
        name: gear.getDisplayName(),
        weight: Number(gear.getWeight()) || 0,
        category: gear.getCategory(),
      })),
    };
    const startDate = this.getDate(bag.getStartDateValue(), bag.getStartDate());
    const endDate = this.getDate(bag.getEndDateValue(), bag.getEndDate());
    const destinationName = bag.getLocationName();

    if (startDate) {
      snapshot.startDate = startDate;
    }

    if (endDate) {
      snapshot.endDate = endDate;
    }

    if (destinationName) {
      snapshot.destinationName = destinationName;
    }

    return snapshot;
  }

  private getDate(value: number | null, formattedValue: string) {
    if (value === null) {
      return null;
    }

    const date = formattedValue.replaceAll('.', '-');

    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }
}

export default CommunityBagSnapshotBuilder;
