import { FC, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import { getDisplayHost } from '../../model/gear/GearBrandLink';

/** 이미지 밴드 높이. 상품 사진이 대부분 정사각이라 밴드가 너무 납작하면 크게 letterbox 된다. */
const IMAGE_HEIGHT = 180;
/** 이미지가 없을 때 쓰는 좌측 아이콘 타일. */
const TILE_SIZE = 56;

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
  // useRef(new Animated.Value()).current는 렌더 중 ref 접근이라 lint가 막는다.
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [pulse]);

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

      {settled ? null : (
        <Animated.View
          style={[styles.skeleton, { opacity: pulse }]}
          accessibilityElementsHidden
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

      <Ionicons name='chevron-forward' size={16} color={Color.iconMuted} />
    </>
  );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => warehouseDetail.openProductUrl()}
      activeOpacity={0.7}
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
              color={Color.textTertiary}
            />
          </View>
          {renderText()}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Color.borderLight,
    // 이미지가 카드 모서리를 넘지 않게 자른다.
    overflow: 'hidden',
  },
  band: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: Color.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Color.surfaceMuted,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  iconBox: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  host: {
    fontSize: 12,
    color: Color.textSecondary,
  },
});

export default observer(WarehouseDetailBrandPreviewView);
