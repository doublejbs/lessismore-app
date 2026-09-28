import { makeAutoObservable, observable } from 'mobx';
import type { NativeAd } from 'react-native-google-mobile-ads';
import AdPlacement from './AdPlacement';
import { AdServiceContract } from './AdServiceContract';

/**
 * AD-1·AD-3·AD-5: 한 장짜리 광고 자리(장비 상세·홈 맨 끝). 화면이 1개 만들어 수명을 함께한다.
 *
 * - 화면이 포커스될 때(`start`) 동의 뒤에 광고 하나를 요청해 들고 있다. 받기 전·받지 못하면 자리를
 *   접는다(빈 칸·스켈레톤 없음).
 * - `startsConsentFlow`가 false인 자리(홈)는 동의 흐름을 시작하지 않는다 — 이전에 마친 동의가
 *   있을 때만 요청한다(`AdService.prepareIfConsentedBefore`).
 * - 광고를 받지 못했으면(동의 없음·채울 광고 없음) 다음 포커스에 다시 시도한다. 받은 광고는
 *   화면이 사라지거나 자리를 끌 때(`dispose`) 해제한다.
 */
class SingleAdSlot {
  public static from(
    placement: AdPlacement,
    adService: AdServiceContract,
    startsConsentFlow: boolean
  ) {
    return new SingleAdSlot(placement, adService, startsConsentFlow);
  }

  private ad: NativeAd | null = null;
  private loading = false;
  private disposed = false;

  private constructor(
    private readonly placement: AdPlacement,
    private readonly adService: AdServiceContract,
    private readonly startsConsentFlow: boolean
  ) {
    makeAutoObservable<
      SingleAdSlot,
      | 'ad'
      | 'loading'
      | 'disposed'
      | 'placement'
      | 'adService'
      | 'startsConsentFlow'
    >(this, {
      ad: observable.ref,
      loading: false,
      disposed: false,
      placement: false,
      adService: false,
      startsConsentFlow: false,
    });
  }

  public async start() {
    if (this.ad) {
      return;
    }

    // 개발 모드 StrictMode의 마운트→해제→마운트에서도 다시 시작할 수 있게 한다 — 요청 중에 해제됐다가
    // 다시 시작되면 진행 중인 요청이 그대로 자리를 채운다.
    this.disposed = false;

    if (this.loading) {
      return;
    }

    this.loading = true;

    try {
      const canRequestAds = this.startsConsentFlow
        ? await this.adService.prepare()
        : await this.adService.prepareIfConsentedBefore();

      if (this.disposed || !canRequestAds) {
        return;
      }

      const ad = await this.adService.loadNativeAd(this.placement);

      if (!ad) {
        return;
      }

      if (this.disposed || this.ad) {
        ad.destroy();

        return;
      }

      this.setAd(ad);
    } finally {
      this.loading = false;
    }
  }

  public getAd(): NativeAd | null {
    return this.ad;
  }

  // 자리에서 먼저 빼고(관찰 값 비움 → 광고 카드가 내려감) 다음 틱에 해제한다 — 광고 뷰가 아직
  // 붙어 있는 채로 네이티브 광고를 해제하지 않게 한다(AdSlotList.dispose와 같은 순서).
  public dispose() {
    const ad = this.ad;

    this.disposed = true;
    this.ad = null;

    if (ad) {
      setTimeout(() => {
        ad.destroy();
      }, 0);
    }
  }

  private setAd(ad: NativeAd) {
    this.ad = ad;
  }
}

export default SingleAdSlot;
