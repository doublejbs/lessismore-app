import type {
  GoogleMobileAds,
  TrackingTransparency,
} from './GoogleMobileAdsModule';

// AD-4: 웹에는 광고를 두지 않는다 — 광고 SDK를 번들에 싣지 않는다.
export const loadGoogleMobileAds = (): GoogleMobileAds | null => {
  return null;
};

export const loadTrackingTransparency = (): TrackingTransparency | null => {
  return null;
};
