import BagItem from '@/model/bag/BagItem';
import Gear from '@/model/gear/Gear';
import {
  CommunityBagSnapshot,
  CommunityBagSnapshotGear,
} from './CommunityData';

class CommunityBagSnapshotBuilder {
  public static build(bag: BagItem, gears: Gear[]): CommunityBagSnapshot {
    return new CommunityBagSnapshotBuilder().build(bag, gears);
  }

  public static fromFirestore(value: unknown): CommunityBagSnapshot | null {
    return new CommunityBagSnapshotBuilder().fromFirestore(value);
  }

  public build(bag: BagItem, gears: Gear[]): CommunityBagSnapshot {
    const snapshot: CommunityBagSnapshot = {
      name: bag.getName(),
      totalWeight: bag.getWeightGram(),
      itemCount: bag.getGearCount(),
      gears: gears.map(gear => ({
        ...(!gear.getIsCustom() ? { gearId: gear.getId() } : {}),
        company: gear.getCompanyKorean() || gear.getCompany(),
        name: gear.getDisplayName(),
        weight: Number(gear.getWeight()) || 0,
        category: gear.getCategory(),
      })),
    };
    const startDate = this.getDate(bag.getStartDateValue(), bag.getStartDate());
    const endDate = this.getDate(bag.getEndDateValue(), bag.getEndDate());
    const destinationName = bag.getLocationName();
    const campSpotId = bag.getLocation()?.campSpotId;
    const weather = bag.getWeather();

    if (startDate) {
      snapshot.startDate = startDate;
    }

    if (endDate) {
      snapshot.endDate = endDate;
    }

    if (destinationName) {
      snapshot.destinationName = destinationName;
    }

    if (campSpotId) {
      snapshot.campSpotId = campSpotId;
    }

    if (weather && startDate && endDate) {
      const days = weather.daily
        .filter(day => day.date >= startDate && day.date <= endDate)
        .map(day => ({
          date: day.date,
          code: day.code,
          tempMax: day.tempMax,
          tempMin: day.tempMin,
        }));

      if (days.length > 0) {
        snapshot.weather = {
          days,
          ...(weather.locationName
            ? { locationName: weather.locationName }
            : {}),
        };
      }
    }

    return snapshot;
  }

  public fromFirestore(value: unknown): CommunityBagSnapshot | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const data = value as { gears?: unknown } & Omit<CommunityBagSnapshot, 'gears'>;

    if (!Array.isArray(data.gears)) {
      return null;
    }

    return {
      ...data,
      gears: data.gears.flatMap(item => {
        if (!item || typeof item !== 'object') {
          return [];
        }

        const gear = item as CommunityBagSnapshotGear;
        const { gearId, ...gearData } = gear;

        return [
          {
            ...gearData,
            ...(typeof gearId === 'string' ? { gearId } : {}),
          },
        ];
      }),
    };
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
