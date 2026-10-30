import dayjs, { Dayjs } from 'dayjs';
import app from '../app/App';
import Gear from '../gear/Gear';
import { BagLocation } from '../bag-destination/BagLocation';
import { saveBagDestination } from '../bag-destination/BagDestinationSave';
import BagStore from '../store/BagStore';
import GearStore from '../store/GearStore';
import CampSpotStore from '../store/CampSpotStore';
import AssistantAction from './AssistantAction';
import AssistantActionName from './AssistantActionName';
import AssistantGearSource from './AssistantGearSource';
import {
  AssistantGearItem,
  readGearItems,
  readOptionalString,
  readString,
  readStringList,
} from './AssistantActionInput';
import { AssistantApplyOutcome } from './AssistantApplyOutcome';
import { AssistantTrip } from './AssistantTrip';
import { ASSISTANT_TOOL_MESSAGE as MESSAGE } from './AssistantToolMessage';

// 도구 입력의 날짜 형식(AS-5). 서버가 `today` 기준으로 계산해 넘긴다.
const DATE_FORMAT = 'YYYY-MM-DD';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface SkippedGear {
  name: string;
  reason: string;
}

interface GearApplyResult {
  applied: Gear[];
  skipped: SkippedGear[];
  failed: string[];
  allGears: Gear[];
}

const parseDate = (value: unknown): Dayjs | null => {
  const text = readString(value);

  if (!DATE_PATTERN.test(text)) {
    return null;
  }

  const date = dayjs(text).startOf('day');

  return date.isValid() ? date : null;
};

const getTotalWeight = (gears: Gear[]): number => {
  return gears.reduce(
    (sum, gear) => sum + (parseInt(gear.getWeight() || '0', 10) || 0),
    0
  );
};

const getNames = (gears: Gear[]): string[] => {
  return gears.map(gear => gear.getDisplayName());
};

/**
 * 쓰기 도구를 **기존 스토어 경로로만** 적용한다(AS-5) — 새 Firestore 쓰기 경로를 만들지 않는다.
 * 여행 생성 순서·부분 실패 처리는 첫 여행 가이드(OnboardingTrip.create)와 같다: 여행을 먼저 만들고,
 * 여행지·메모·장비 중 일부가 실패해도 여행은 남기고 실패 항목을 결과에 적는다.
 */
class AssistantActionApplier {
  public static new() {
    return new AssistantActionApplier(
      app.getBagStore()!,
      app.getGearStore()!,
      app.getCampSpotStore()!
    );
  }

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public async apply(
    action: AssistantAction,
    trip: AssistantTrip | null
  ): Promise<AssistantApplyOutcome> {
    const name = action.getName();
    const input = action.getInput();

    if (!name) {
      return this.fail(MESSAGE.unknownTool, 'unknown');
    }

    try {
      if (name === AssistantActionName.CreateTrip) {
        return await this.createTrip(input);
      }

      if (!trip) {
        return this.fail(MESSAGE.noTrip, 'noTrip');
      }

      switch (name) {
        case AssistantActionName.AddGears: {
          return await this.addGears(trip, input);
        }
        case AssistantActionName.RemoveGears: {
          return await this.removeGears(trip, input);
        }
        case AssistantActionName.UpdateTripInfo: {
          return await this.updateTripInfo(trip, input);
        }
        case AssistantActionName.SetDestination: {
          return await this.setDestination(trip, input);
        }
        case AssistantActionName.UpdateMemo: {
          return await this.updateMemo(trip, input);
        }
      }
    } catch (error) {
      console.warn('AI 도우미 변경 적용 실패', error); // l10n-ignore: console 개발자 로그

      return this.fail(MESSAGE.saveFailed, 'save');
    }
  }

  private async createTrip(
    input: Record<string, unknown>
  ): Promise<AssistantApplyOutcome> {
    const name = readString(input.name);
    const startDate = parseDate(input.startDate);
    const endDate = parseDate(input.endDate);

    if (!name) {
      return this.fail(MESSAGE.invalidName, 'invalid');
    }

    if (!startDate || !endDate) {
      return this.fail(MESSAGE.invalidDate, 'invalid');
    }

    if (endDate.isBefore(startDate, 'day')) {
      return this.fail(MESSAGE.dateOrder, 'dateOrder');
    }

    // ① 여행 생성 — 여기서 실패하면 아무것도 남지 않는다(호출부 catch → 실패).
    const bagId = await this.bagStore.add(name, startDate, endDate);
    const failed: string[] = [];
    let location: BagLocation | null = null;

    // ② 여행지 — 등록 박지(`camp-spot/{id}`)만 설정한다.
    const campSpotId = readOptionalString(input.campSpotId);

    if (campSpotId) {
      try {
        location = await this.saveDestination(bagId, campSpotId);

        if (!location) {
          failed.push('destination');
        }
      } catch (error) {
        console.warn('AI 도우미 여행지 저장 실패', error); // l10n-ignore: console 개발자 로그
        failed.push('destination');
      }
    }

    // ③ 메모
    const memo = readOptionalString(input.memo);

    if (memo) {
      try {
        await this.bagStore.updateMemo(bagId, memo);
      } catch (error) {
        console.warn('AI 도우미 메모 저장 실패', error); // l10n-ignore: console 개발자 로그
        failed.push('memo');
      }
    }

    // ④ 장비 — 카탈로그는 창고 등록 후, 창고 장비와 함께 한 번에 담는다.
    const gearResult = await this.putGears(
      bagId,
      readGearItems(input.gears),
      []
    );

    failed.push(...gearResult.failed);

    const trip: AssistantTrip = { bagId, name, startDate, endDate };

    return {
      ok: true,
      content: {
        bagId,
        name,
        ...(location
          ? {
              location: {
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
              },
            }
          : {}),
        gearsApplied: getNames(gearResult.applied),
        gearsSkipped: gearResult.skipped,
        failed,
        totalWeightG: getTotalWeight(gearResult.allGears),
      },
      note: this.getPartialNote(failed.length, gearResult.failed.length),
      trip,
      createdBagId: bagId,
    };
  }

  private async addGears(
    trip: AssistantTrip,
    input: Record<string, unknown>
  ): Promise<AssistantApplyOutcome> {
    const owned = await this.bagStore.getOwnedBagWithGears(trip.bagId);

    if (!owned) {
      return this.fail(MESSAGE.tripNotFound, 'notFound');
    }

    const result = await this.putGears(
      trip.bagId,
      readGearItems(input.items),
      owned.gears
    );

    if (result.applied.length === 0 && result.failed.length > 0) {
      return this.fail(MESSAGE.saveFailed, 'save');
    }

    if (result.applied.length === 0 && result.skipped.length === 0) {
      return this.fail(MESSAGE.noGears, 'notFound');
    }

    return {
      ok: true,
      content: {
        applied: getNames(result.applied),
        skipped: result.skipped,
        failed: result.failed,
        totalWeightG: getTotalWeight(result.allGears),
      },
      note: this.getPartialNote(result.failed.length, result.failed.length),
      trip,
      createdBagId: null,
    };
  }

  private async removeGears(
    trip: AssistantTrip,
    input: Record<string, unknown>
  ): Promise<AssistantApplyOutcome> {
    const gearIds = new Set(readStringList(input.gearIds));
    const owned = await this.bagStore.getOwnedBagWithGears(trip.bagId);

    if (!owned) {
      return this.fail(MESSAGE.tripNotFound, 'notFound');
    }

    const toRemove = owned.gears.filter(gear => gearIds.has(gear.getId()));

    if (toRemove.length === 0) {
      return this.fail(MESSAGE.notInTrip, 'notFound');
    }

    const remaining = owned.gears.filter(gear => !gearIds.has(gear.getId()));

    // 장비 편집(BagEdit.removeGear)과 같은 제거 경로 — 배낭·장비 문서를 한 트랜잭션으로 갱신한다(BD-4).
    await this.bagStore.save(trip.bagId, [], toRemove, remaining);

    return {
      ok: true,
      content: {
        removed: toRemove.length,
        totalWeightG: getTotalWeight(remaining),
      },
      note: '',
      trip,
      createdBagId: null,
    };
  }

  private async updateTripInfo(
    trip: AssistantTrip,
    input: Record<string, unknown>
  ): Promise<AssistantApplyOutcome> {
    const name = readOptionalString(input.name);
    const hasStart = readString(input.startDate).length > 0;
    const hasEnd = readString(input.endDate).length > 0;
    const startDate = hasStart ? parseDate(input.startDate) : trip.startDate;
    const endDate = hasEnd ? parseDate(input.endDate) : trip.endDate;

    if (!name && !hasStart && !hasEnd) {
      return this.fail(MESSAGE.nothingToUpdate, 'invalid');
    }

    if (!startDate || !endDate) {
      return this.fail(MESSAGE.invalidDate, 'invalid');
    }

    if (endDate.isBefore(startDate, 'day')) {
      return this.fail(MESSAGE.dateOrder, 'dateOrder');
    }

    if (name) {
      await this.bagStore.updateName(trip.bagId, name);
    }

    if (hasStart || hasEnd) {
      await this.bagStore.updateDates(
        trip.bagId,
        startDate.toISOString(),
        endDate.toISOString()
      );
    }

    const next: AssistantTrip = {
      bagId: trip.bagId,
      name: name ?? trip.name,
      startDate,
      endDate,
    };

    return {
      ok: true,
      content: {
        name: next.name,
        startDate: startDate.format(DATE_FORMAT),
        endDate: endDate.format(DATE_FORMAT),
      },
      note: '',
      trip: next,
      createdBagId: null,
    };
  }

  private async setDestination(
    trip: AssistantTrip,
    input: Record<string, unknown>
  ): Promise<AssistantApplyOutcome> {
    const campSpotId = readString(input.campSpotId);
    const location = campSpotId
      ? await this.saveDestination(trip.bagId, campSpotId)
      : null;

    if (!location) {
      return this.fail(MESSAGE.spotNotFound, 'notFound');
    }

    return {
      ok: true,
      content: {
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      note: '',
      trip,
      createdBagId: null,
    };
  }

  private async updateMemo(
    trip: AssistantTrip,
    input: Record<string, unknown>
  ): Promise<AssistantApplyOutcome> {
    const memo = readString(input.memo);

    if (!memo) {
      return this.fail(MESSAGE.memoEmpty, 'invalid');
    }

    await this.bagStore.updateMemo(trip.bagId, memo);

    return {
      ok: true,
      content: { saved: true },
      note: '',
      trip,
      createdBagId: null,
    };
  }

  // 등록 박지를 읽어 여행지로 저장한다(DST-6 — 좌표 변경 시 날씨 캐시 제거까지 기존 경로가 처리). 박지가 없으면 null.
  private async saveDestination(
    bagId: string,
    campSpotId: string
  ): Promise<BagLocation | null> {
    const spot = await this.campSpotStore.getSpot(campSpotId);

    if (!spot) {
      return null;
    }

    const location: BagLocation = {
      name: spot.name,
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
      campSpotId,
    };

    await saveBagDestination(this.bagStore, bagId, location);

    return location;
  }

  /**
   * 장비를 여행에 담는다. 이미 담긴 장비·찾지 못한 장비는 건너뛰고, 카탈로그 장비는 창고에 먼저 등록한다
   * (SR-3 사본 규칙은 `getCatalogGear`가 지킨다). 등록이 실패한 카탈로그 장비는 담지 않는다 —
   * 창고 문서가 없는 장비 id를 배낭에 넣으면 상세에서 빈 항목이 된다.
   */
  private async putGears(
    bagId: string,
    items: AssistantGearItem[],
    currentGears: Gear[]
  ): Promise<GearApplyResult> {
    const seen = new Set(currentGears.map(gear => gear.getId()));
    const catalogGears: Gear[] = [];
    const warehouseGears: Gear[] = [];
    const skipped: SkippedGear[] = [];
    const failed: string[] = [];

    for (const item of items) {
      const label = item.name || item.gearId;

      if (seen.has(item.gearId)) {
        skipped.push({ name: label, reason: 'already_in_trip' });
        continue;
      }

      seen.add(item.gearId);

      try {
        const gear =
          item.source === AssistantGearSource.Catalog
            ? await this.gearStore.getCatalogGear(item.gearId)
            : await this.gearStore.getUserGear(item.gearId);

        if (!gear) {
          skipped.push({ name: label, reason: 'not_found' });
          continue;
        }

        if (item.source === AssistantGearSource.Catalog) {
          catalogGears.push(gear);
        } else {
          warehouseGears.push(gear);
        }
      } catch (error) {
        console.warn('AI 도우미 장비 조회 실패', error); // l10n-ignore: console 개발자 로그
        failed.push(label);
      }
    }

    const registeredCatalog = await this.registerCatalogGears(catalogGears, failed);

    const toAdd = [...warehouseGears, ...registeredCatalog];

    if (toAdd.length === 0) {
      return { applied: [], skipped, failed, allGears: currentGears };
    }

    try {
      await this.bagStore.save(bagId, toAdd, [], [...currentGears, ...toAdd]);
    } catch (error) {
      console.warn('AI 도우미 장비 담기 실패', error); // l10n-ignore: console 개발자 로그
      failed.push(...getNames(toAdd));

      return { applied: [], skipped, failed, allGears: currentGears };
    }

    return {
      applied: toAdd,
      skipped,
      failed,
      allGears: [...currentGears, ...toAdd],
    };
  }

  /**
   * 카탈로그 장비를 창고에 등록하고 **실제로 생긴 것만** 돌려준다. `GearStore.register`는 실패를 삼키고
   * 던지지 않으므로(다른 호출부 때문에 그대로 둔다) 등록 뒤 창고 문서를 다시 읽어 확인한다 —
   * 창고 문서가 없는 장비를 배낭에 담으면 상세에서 빈 항목이 된다.
   */
  private async registerCatalogGears(
    catalogGears: Gear[],
    failed: string[]
  ): Promise<Gear[]> {
    if (catalogGears.length === 0) {
      return [];
    }

    try {
      await this.gearStore.register(catalogGears);
    } catch (error) {
      console.warn('AI 도우미 카탈로그 장비 창고 등록 실패', error); // l10n-ignore: console 개발자 로그
    }

    const registered: Gear[] = [];

    for (const gear of catalogGears) {
      try {
        if (await this.gearStore.getUserGear(gear.getId())) {
          registered.push(gear);
        } else {
          failed.push(gear.getDisplayName());
        }
      } catch (error) {
        console.warn('AI 도우미 창고 등록 확인 실패', error); // l10n-ignore: console 개발자 로그
        failed.push(gear.getDisplayName());
      }
    }

    return registered;
  }

  // 부분 실패 상태 줄(§6) — 장비만 실패했으면 `장비 n개 실패`, 그 밖의 항목이 섞이면 `일부 항목 실패`.
  private getPartialNote(failedCount: number, failedGearCount: number): string {
    if (failedCount === 0) {
      return '';
    }

    if (failedCount === failedGearCount) {
      return app
        .getL10n()
        .t('assistant.action.note.gearsFailed', { count: failedGearCount });
    }

    return app.getL10n().t('assistant.action.note.partialFailed');
  }

  private fail(message: string, reasonKey: string): AssistantApplyOutcome {
    return {
      ok: false,
      message,
      note: app.getL10n().t(`assistant.action.failure.${reasonKey}`),
    };
  }
}

export default AssistantActionApplier;
