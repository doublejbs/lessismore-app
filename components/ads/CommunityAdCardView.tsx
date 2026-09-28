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
import useAdImpressionTracking from './useAdImpressionTracking';

// 게시글 카드(`CommunityFeedCardView`)와 같은 문법 — 안쪽 여백 `AcgLayout.communityCardPadding`,
// 줄 간격 `AcgLayout.chipGap`. 미디어 틀은 폭을 카드에 맞춰 늘이고 높이는 고정한다 — `aspectRatio`를
// 쓰면 안드로이드에서 네이티브 미디어 뷰가 높이부터 풀려 틀이 카드보다 좁아졌다. 높이는 폰 폭 카드에서
// 대략 16:9이고 구글 네이티브 미디어 최소 크기(120)를 넘는다.
const MEDIA_HEIGHT = 180;

// 작성자·시간 두 줄 사이, 본문과 아래 줄 사이의 틈. 게시글 카드와 같은 값이고 맞는 간격 토큰이 없다.
const META_LINE_GAP = 2;

const HEADLINE_MAX_LINES = 2;
const BODY_MAX_LINES = 3;

// 카드 안 행동 유도는 HIG 44pt 터치 타깃을 채운다. 세로 패딩은 라벨 줄박스에서 셈한다 —
// 고정 높이를 두지 않아 Dynamic Type으로 글자가 커지면 알약도 자란다.
const CTA_MIN_HEIGHT = 44;
const CTA_PADDING_VERTICAL = (CTA_MIN_HEIGHT - AcgType.control.lineHeight) / 2;

interface Props {
  nativeAd: NativeAd;
}

// AD-2: 커뮤니티 피드·홈·장비 상세의 네이티브 광고 카드. 게시글 카드와 같은 문법 —
// 미디어(대표 이미지 자리) / 광고주(작성자 자리) · `광고`(시간 자리) / 제목 / 설명 / 행동 유도.
// 설명·행동 유도는 광고에 있을 때만 그린다. 에셋은 전부 SDK 뷰에 등록한다.
const CommunityAdCardView: FC<Props> = ({ nativeAd }) => {
  const sdk = loadGoogleMobileAds();
  const l10n = app.getL10n();

  useAdImpressionTracking(nativeAd, sdk !== null);

  if (!sdk) {
    return null;
  }

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = sdk;
  const advertiser = nativeAd.advertiser;
  const body = nativeAd.body;
  const callToAction = nativeAd.callToAction;

  return (
    <NativeAdView nativeAd={nativeAd}>
      <View style={styles.card}>
        {/* 미디어는 흰 틀 안에 가운데로 담는다(FeedAdCellView와 같은 처리). 안드로이드 네이티브 미디어 뷰는
            카드의 모서리 잘라내기를 받지 않아, 카드에 바로 붙이면 contain 이미지가 왼쪽으로 붙고 카드의
            둥근 모서리 밖으로 비어져 나온다 — 모서리를 가진 틀로 한 번 더 감싸 잘라낸다. */}
        <View style={styles.mediaFrame}>
          <NativeMediaView style={styles.media} resizeMode='contain' />
        </View>

        <View style={styles.content}>
          <View style={styles.meta}>
            {advertiser ? (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <PretendardText
                  style={styles.advertiser}
                  weight='semibold'
                  numberOfLines={1}
                >
                  {advertiser}
                </PretendardText>
              </NativeAsset>
            ) : null}
            {/* AD-2: `광고` 표시는 메타 글자 — 배지 면을 만들지 않는다. */}
            <PretendardText style={styles.label} numberOfLines={1}>
              {l10n.t('ad.label')}
            </PretendardText>
          </View>

          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <PretendardText
              style={styles.headline}
              weight='medium'
              numberOfLines={HEADLINE_MAX_LINES}
            >
              {nativeAd.headline}
            </PretendardText>
          </NativeAsset>

          {body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <PretendardText style={styles.body} numberOfLines={BODY_MAX_LINES}>
                {body}
              </PretendardText>
            </NativeAsset>
          ) : null}

          {callToAction ? (
            <View style={styles.footer}>
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
            </View>
          ) : null}
        </View>
      </View>
    </NativeAdView>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  // 좌우 여백은 아래 글자 블록과 같은 카드 안쪽 여백 — 액자와 제목의 시작선이 맞는다.
  mediaFrame: {
    alignSelf: 'stretch',
    height: MEDIA_HEIGHT,
    marginTop: AcgLayout.communityCardPadding,
    marginHorizontal: AcgLayout.communityCardPadding,
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
  content: {
    gap: AcgLayout.chipGap,
    padding: AcgLayout.communityCardPadding,
  },
  meta: {
    gap: META_LINE_GAP,
  },
  advertiser: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  label: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
  headline: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  body: {
    ...AcgType.rowSubtitle,
    color: Acg.textSecondary,
  },
  footer: {
    marginTop: META_LINE_GAP,
    alignItems: 'flex-start',
  },
  // 보조 알약. 카드 면이 연회색이라 흰 채움으로 갈린다 — 라임을 쓰지 않는다.
  cta: {
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

export default CommunityAdCardView;
