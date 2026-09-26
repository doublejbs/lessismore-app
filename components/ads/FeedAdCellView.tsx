import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeAd } from 'react-native-google-mobile-ads';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
  Radius,
  Spacing,
} from '@/constants/DesignTokens';
import { loadGoogleMobileAds } from '@/model/ads/GoogleMobileAdsModule';
import app from '@/model/app/App';

// 네이티브 광고 미디어는 120×120 이상이어야 한다(AdMob 네이티브 정책). 셀 폭(~164) 전체에 높이 120 —
// 이 이상 키우면 이웃 장비 셀(최소 150)이 그만큼 늘어나 가운데가 빈다.
const MEDIA_HEIGHT = 120;

const HEADLINE_MAX_LINES = 2;

// 행동 유도 알약은 피드 셀 담기 버튼(36)과 같은 높이다. 세로 패딩은 라벨 줄박스에서 셈한다 —
// 고정 높이를 두지 않아 Dynamic Type으로 글자가 커지면 알약도 자란다.
const CTA_MIN_HEIGHT = 36;
const CTA_PADDING_VERTICAL = (CTA_MIN_HEIGHT - AcgType.control.lineHeight) / 2;

// 행동 유도 문구가 길어도(`자세히 알아보기` 등) 옆의 `광고`·광고주 자리를 남긴다 — 넘치면 말줄임.
const CTA_MAX_WIDTH = '60%';

interface Props {
  nativeAd: NativeAd;
}

// AD-2: 탐색 피드 그리드의 네이티브 광고 셀. 피드 셀과 같은 연회색 면 하나에
// 미디어(면 위쪽 띠) / 제목 / [`광고`·광고주 · 행동 유도]를 담는다.
// 셀 높이를 이웃 장비 셀에 가깝게 두려고 줄을 줄였다 — 미디어는 정책 최소 높이(120)의 띠로 두고
// `contain`으로 잘림 없이 넣으며, 광고 표시·광고주는 따로 줄을 두지 않고 행동 유도 옆 두 줄에 싣는다.
// 설명(body)은 셀을 크게 늘리므로 그리드에서는 싣지 않는다(있을 때만 그리는 선택 에셋).
// AdChoices 아이콘은 SDK가 광고 뷰 우상단(미디어 띠 모서리)에 그린다.
// 광고 에셋은 전부 `NativeAsset`으로 SDK 뷰에 등록한다 — 등록하지 않으면 클릭·노출이 집계되지 않는다.
const FeedAdCellView: FC<Props> = ({ nativeAd }) => {
  const sdk = loadGoogleMobileAds();
  const l10n = app.getL10n();

  if (!sdk) {
    return null;
  }

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = sdk;
  const advertiser = nativeAd.advertiser;
  const callToAction = nativeAd.callToAction;

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.cell}>
      <View style={styles.face}>
        {/* 미디어를 면 모서리에 붙이면 안드로이드에서 모서리가 잘리지 않고, `contain` 이미지가 한쪽으로
            쏠린다 — 흰 액자 안에 가운데로 둔다(피드 셀의 흰 담기 버튼과 같은 층). */}
        <View style={styles.mediaFrame}>
          <NativeMediaView style={styles.media} resizeMode='contain' />
        </View>

        <View style={styles.content}>
          {/* 피드 셀의 제품명과 같은 단. */}
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <PretendardText
              style={styles.headline}
              weight='semibold'
              numberOfLines={HEADLINE_MAX_LINES}
            >
              {nativeAd.headline}
            </PretendardText>
          </NativeAsset>

          <View style={styles.footer}>
            <View style={styles.meta}>
              {/* AD-2: `광고` 표시는 메타 글자 — 배지 면을 만들지 않는다. */}
              <PretendardText style={styles.label} numberOfLines={1}>
                {l10n.t('ad.label')}
              </PretendardText>
              {advertiser ? (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  {/* 피드 셀의 브랜드 자리와 같은 문법(메타 · 잉크). */}
                  <PretendardText
                    style={styles.advertiser}
                    weight='medium'
                    numberOfLines={1}
                  >
                    {advertiser}
                  </PretendardText>
                </NativeAsset>
              ) : null}
            </View>

            {callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View
                  style={styles.cta}
                  collapsable={false}
                  accessibilityRole='button'
                >
                  <PretendardText
                    style={styles.ctaText}
                    weight='semibold'
                    numberOfLines={1}
                  >
                    {callToAction}
                  </PretendardText>
                </View>
              </NativeAsset>
            ) : null}
          </View>
        </View>
      </View>
    </NativeAdView>
  );
};

const styles = StyleSheet.create({
  cell: {
    flex: 1,
  },
  // 피드 셀(`FeedGridCellView`)의 면과 같은 채움·모서리.
  face: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  mediaFrame: {
    height: MEDIA_HEIGHT,
    marginTop: Spacing.item,
    marginHorizontal: Spacing.item,
    overflow: 'hidden',
    borderRadius: AcgRadius.chip,
    backgroundColor: Acg.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  // 피드 셀 면과 같은 안쪽 여백·줄 간격.
  content: {
    flex: 1,
    padding: Spacing.item,
    gap: AcgLayout.chipGap,
  },
  headline: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  // 피드 셀의 무게 줄처럼 면 바닥에 붙는다 — 같은 행 두 셀의 바닥 줄이 한 선에 온다.
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  // `minWidth: 0`이 없으면 긴 광고주 이름이 행동 유도 알약을 면 밖으로 밀어낸다.
  meta: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  advertiser: {
    ...AcgType.meta,
    color: Acg.ink,
  },
  // 보조 알약. 면이 연회색이라 피드 셀의 담기 버튼처럼 흰 채움으로 갈린다 — 라임을 쓰지 않는다.
  cta: {
    flexShrink: 1,
    maxWidth: CTA_MAX_WIDTH,
    minHeight: CTA_MIN_HEIGHT,
    paddingHorizontal: Spacing.item,
    paddingVertical: CTA_PADDING_VERTICAL,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    justifyContent: 'center',
  },
  ctaText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default FeedAdCellView;
