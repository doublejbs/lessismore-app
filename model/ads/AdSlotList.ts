import { makeAutoObservable, observable } from 'mobx';
import type { NativeAd } from 'react-native-google-mobile-ads';
import { AD_REQUEST_LOOKAHEAD } from './AdConstants';
import { AdListEntry } from './AdListEntry';
import { getAdSlotPosition, interleaveAdSlots } from './AdListLayout';
import AdPlacement from './AdPlacement';
import { AdServiceContract } from './AdServiceContract';

type EntriesCache = {
  items: readonly unknown[];
  itemCount: number;
  adsVersion: number;
  entries: AdListEntry<unknown>[];
};

/**
 * AD-1·AD-5: 목록 하나의 광고 자리들. 목록 화면이 1개 만들어 수명을 함께한다.
 *
 * - 광고는 **받은 뒤에만** 목록에 끼운다. 받는 동안 빈 칸·스켈레톤을 두지 않고, 받지 못한 자리는
 *   끼우지 않는다(= 접는다).
 * - 화면에 보이는 마지막 항목에서 `AD_REQUEST_LOOKAHEAD`만큼 앞선 자리까지만 요청한다.
 * - 받았을 때 그 자리가 화면 아래(보이는 마지막 항목 뒤)가 아니면 끼우지 않고 버린다 — 이미 보이는
 *   자리에 늦게 온 광고를 끼우면 보고 있던 항목이 밀린다. 버린 자리는 이 목록 동안 접힌 채 둔다.
 * - 받은 광고는 목록이 사라질 때(`dispose`) 모두 해제한다. 스크롤 중에는 해제하지 않는다 — 위쪽
 *   광고를 해제하면 자리가 접혀 콘텐츠가 튄다.
 */
class AdSlotList {
  public static from(
    placement: AdPlacement,
    adService: AdServiceContract,
    columnCount: number
  ) {
    return new AdSlotList(placement, adService, columnCount);
  }

  private readonly ads = new Map<number, NativeAd>();
  private readonly requestedSlots = new Set<number>();
  // 받은 광고가 바뀔 때마다 오른다 — `getEntries` 캐시가 광고 도착을 알아보는 열쇠.
  private adsVersion = 0;
  private entriesCache: EntriesCache | null = null;
  private lastVisibleOrdinal = 0;
  private itemCount = 0;
  private started = false;
  private ready = false;
  private disposed = false;

  private constructor(
    private readonly placement: AdPlacement,
    private readonly adService: AdServiceContract,
    // 그리드의 열 수. 늦게 온 광고를 끼워도 되는 "마지막 보이는 줄"을 가르는 데 쓴다.
    private readonly columnCount: number
  ) {
    makeAutoObservable<
      AdSlotList,
      | 'ads'
      | 'requestedSlots'
      | 'entriesCache'
      | 'lastVisibleOrdinal'
      | 'itemCount'
      | 'started'
      | 'ready'
      | 'disposed'
      | 'placement'
      | 'adService'
      | 'columnCount'
    >(this, {
      ads: observable.shallow,
      requestedSlots: false,
      entriesCache: false,
      lastVisibleOrdinal: false,
      itemCount: false,
      started: false,
      ready: false,
      disposed: false,
      placement: false,
      adService: false,
      columnCount: false,
    });
  }

  // AD-3: 이 목록 화면에 처음 포커스될 때 동의 흐름을 태운다(앱 수명 동안 한 번, 결과는 서비스가
  // 캐시). 한 번 시작하면 다시 포커스돼도 그대로다 — `dispose` 뒤에만 다시 시작한다.
  public async start() {
    if (this.started) {
      return;
    }

    // 개발 모드 StrictMode의 마운트→해제→마운트에서도 다시 시작할 수 있게 한다.
    this.started = true;
    this.disposed = false;

    const canRequestAds = await this.adService.prepare();

    if (this.disposed || !canRequestAds) {
      return;
    }

    this.ready = true;
    this.requestNearbySlots();
  }

  public setItemCount(itemCount: number) {
    this.itemCount = itemCount;
    this.requestNearbySlots();
  }

  public updateVisibleRange(lastOrdinal: number) {
    this.lastVisibleOrdinal = lastOrdinal;
    this.requestNearbySlots();
  }

  // 같은 항목·같은 광고면 같은 배열을 돌려준다 — FlatList `data`가 렌더마다 새 배열이 되지 않게.
  // `adsVersion`을 읽으므로 observer 화면은 광고가 오면 다시 그린다. 항목 배열은 제자리에서
  // 늘어나기도 해서(`push`) 참조와 길이를 함께 본다.
  public getEntries<T>(items: readonly T[]): AdListEntry<T>[] {
    const adsVersion = this.adsVersion;
    const itemCount = items.length;
    const cache = this.entriesCache;

    if (
      cache &&
      cache.items === items &&
      cache.itemCount === itemCount &&
      cache.adsVersion === adsVersion
    ) {
      return cache.entries as AdListEntry<T>[];
    }

    const entries = interleaveAdSlots(items, slotIndex =>
      this.ads.has(slotIndex)
    );

    this.entriesCache = { items, itemCount, adsVersion, entries };

    return entries;
  }

  public getAd(slotIndex: number): NativeAd | null {
    return this.ads.get(slotIndex) ?? null;
  }

  // 목록이 사라질 때(언마운트·광고를 끄는 쓰임으로 바뀜) 받은 광고를 모두 해제한다.
  // 목록에서 먼저 빼고(관찰 맵 비움 → 광고 셀이 내려감) 다음 틱에 해제한다 — 광고 뷰가 아직
  // 붙어 있는 채로 네이티브 광고를 해제하지 않게 한다.
  public dispose() {
    const ads = Array.from(this.ads.values());

    this.started = false;
    this.disposed = true;
    this.ready = false;
    this.ads.clear();
    this.adsVersion += 1;
    this.requestedSlots.clear();

    setTimeout(() => {
      ads.forEach(ad => ad.destroy());
    }, 0);
  }

  private requestNearbySlots() {
    if (!this.ready || this.disposed) {
      return;
    }

    const limit = Math.min(
      this.lastVisibleOrdinal + AD_REQUEST_LOOKAHEAD,
      this.itemCount
    );

    for (
      let slotIndex = 0;
      getAdSlotPosition(slotIndex) <= limit;
      slotIndex += 1
    ) {
      if (!this.requestedSlots.has(slotIndex)) {
        this.requestedSlots.add(slotIndex);
        void this.loadSlot(slotIndex);
      }
    }
  }

  private async loadSlot(slotIndex: number) {
    const ad = await this.adService.loadNativeAd(this.placement);

    if (!ad) {
      return;
    }

    // AD-1: 화면 위쪽·가운데 자리에는 끼우지 않는다 — 보이는 항목이 밀리지 않게. 화면 아래에
    // 걸친 마지막 줄부터는 끼운다(첫 진입 때 첫 자리가 대개 그 줄이라, 막으면 가장 많이 보이는
    // 광고를 잃는다). 막힌 자리는 `requestedSlots`에 남아 이 목록 동안 다시 요청하지 않는다(접힌 채).
    const isBelowViewport =
      getAdSlotPosition(slotIndex) > this.lastVisibleOrdinal - this.columnCount;

    if (this.disposed || !isBelowViewport || this.ads.has(slotIndex)) {
      ad.destroy();

      return;
    }

    this.setAd(slotIndex, ad);
  }

  private setAd(slotIndex: number, ad: NativeAd) {
    this.ads.set(slotIndex, ad);
    this.adsVersion += 1;
  }
}

export default AdSlotList;
