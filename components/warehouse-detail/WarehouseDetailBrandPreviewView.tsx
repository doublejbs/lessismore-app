import { FC, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import {
  Liquid,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';
import { getDisplayHost } from '../../model/gear/GearBrandLink';

/** 이미지 밴드 높이. 상품 사진이 대부분 정사각이라 밴드가 너무 납작하면 크게 letterbox 된다. */
const IMAGE_HEIGHT = 180;
/** 이미지가 없을 때 쓰는 좌측 아이콘 타일. */
const TILE_SIZE = 56;
/**
 * 이 밴드의 셔머는 다른 스켈레톤(반 주기 600)보다 느리다 — 180pt 면 하나뿐인 큰 덩어리라
 * 빠른 맥박이 눈에 튄다(홈 스켈레톤과 같은 판단).
 */
const SHIMMER_TO = 0.5;
const SHIMMER_HALF_DURATION = 800;

interface Props {
  warehouseDetail: WarehouseDetail;
  label: string;
  productUrl: string;
  /** 상품 페이지의 og:image. 없으면 아이콘 한 줄짜리 카드로 떨어진다. */
  imageUrl: string | undefined;
  /** og 수집이 진행 중인지. 아직 URL을 모르는 구간이라 스켈레톤만 그린다. */
  loading: boolean;
}

interface BandProps {
  imageUrl: string | undefined;
  onFailed: () => void;
}

/**
 * 이미지 밴드 — 로딩 스켈레톤을 이미지 위에 덮고, 로드가 끝나면 걷는다.
 *
 * `imageUrl`을 key로 받아 리마운트되므로 URL이 바뀌면 스켈레톤부터 다시 시작한다.
 */
const PreviewImageBand: FC<BandProps> = ({ imageUrl, onFailed }) => {
  const [settled, setSettled] = useState(false);
  const opacity = useLiquidShimmer({
    to: SHIMMER_TO,
    halfDuration: SHIMMER_HALF_DURATION,
  });

  return (
    <View style={styles.band}>
      {/* 상품 사진은 대부분 흰 배경이라 밴드도 흰색으로 둔다 — contain으로 남는
          좌우 여백이 사진 배경과 이어져 보이지 않는다. */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode='contain'
          onLoad={() => setSettled(true)}
          onError={() => {
            setSettled(true);
            onFailed();
          }}
        />
      ) : null}

      {/* 골격은 이미지 **위**를 덮는다 — 자리를 미리 잡아 두면 도착할 때 높이가 튀지 않는다.
          공용 막대를 절대 채움으로 눌러 쓴다. 모서리는 0인데, 밴드가 카드 상단을 꽉 채우고
          카드가 `overflow: 'hidden'`으로 이미 모양을 깎으므로 여기서 또 깎으면 어긋난다. */}
      {settled ? null : (
        <LiquidSkeletonBar
          opacity={opacity}
          height={IMAGE_HEIGHT}
          radius={0}
          color={Liquid.surfaceSunken}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
};

/**
 * 브랜드 링크 미리보기 카드(GD-5a).
 *
 * 이미지가 있으면 **상단 이미지 밴드 + 하단 텍스트 줄**(카카오톡 링크 카드 형태),
 * 없으면 **아이콘 + 텍스트 한 줄**로 떨어진다. 빈 밴드를 남기지 않기 위해 형태를 나눈다.
 *
 * 로딩 구간이 둘이라 둘 다 스켈레톤으로 덮는다 — ① og 수집(URL을 아직 모름),
 * ② 이미지 다운로드(URL은 알지만 아직 안 그려짐). 수집 단계부터 밴드 자리를 잡아둬야
 * 이미지가 도착할 때 카드 높이가 튀지 않는다.
 *
 * 이미지는 **브랜드 CDN URL로만** 그린다 — 우리 Storage 사본(`imageUrl`)으로 바꿔 쓰면
 * 링크 미리보기가 아니라 우리가 호스팅한 카탈로그 이미지가 된다(DataModel §1 경계).
 */
const WarehouseDetailBrandPreviewView: FC<Props> = ({
  warehouseDetail,
  label,
  productUrl,
  imageUrl,
  loading,
}) => {
  const host = getDisplayHost(productUrl);
  // 공식몰이 아닐 때 라벨이 이미 도메인이라(`thegearshop.co.kr에서 보기`) 아래에 또 쓰면 중복이다.
  const showHost = Boolean(host) && !label.includes(host as string);

  const showBand = Boolean(imageUrl) || loading;

  const renderText = () => (
    <>
      <View style={styles.body}>
        <PretendardText style={styles.label} weight='medium' numberOfLines={2}>
          {label}
        </PretendardText>
        {showHost ? (
          <PretendardText style={styles.host} numberOfLines={1}>
            {host}
          </PretendardText>
        ) : null}
      </View>

      <Ionicons name='chevron-forward' size={16} color={Liquid.inkSubtle} />
    </>
  );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => warehouseDetail.openProductUrl()}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='link'
      accessibilityLabel={`${label}, 상품 페이지 열기`}
    >
      {showBand ? (
        <>
          {/* key로 URL이 바뀌면 리마운트시켜 내부 로딩 상태를 초기화한다
              (useEffect에서 setState 하지 않기 위한 처리). */}
          <PreviewImageBand
            key={imageUrl ?? 'pending'}
            imageUrl={imageUrl}
            onFailed={() => warehouseDetail.markProductImageFailed()}
          />

          <View style={styles.captionRow}>{renderText()}</View>
        </>
      ) : (
        <View style={styles.compactRow}>
          <View style={styles.iconBox}>
            <Ionicons
              name='storefront-outline'
              size={20}
              color={Liquid.inkSecondary}
            />
          </View>
          {renderText()}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  /**
   * 흰 카드. 그림자와 클리핑을 한 뷰에 함께 주면 그림자가 자기 경계에서 잘리는데,
   * 이 카드는 **테두리 없이 면만으로** 서고 이미지가 모서리를 넘지 않아야 하므로
   * 그림자를 포기하고 클리핑을 택한다 — 링크 미리보기는 주 액션이 아니라 조용한 카드다.
   */
  card: {
    borderRadius: LiquidRadius.card,
    backgroundColor: Liquid.surface,
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
    overflow: 'hidden',
  },
  band: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: Liquid.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Liquid.hairline,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: LiquidRadius.thumb,
    backgroundColor: Liquid.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  host: {
    fontSize: 12,
    color: Liquid.inkMuted,
  },
});

export default observer(WarehouseDetailBrandPreviewView);
