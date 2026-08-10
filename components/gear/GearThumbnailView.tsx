import { FC, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';
import { Color, Liquid, LiquidRadius, Radius } from '@/constants/DesignTokens';

// 목록 행 썸네일 한 변(pt). 창고(WH-1)와 배낭 상세(BD-1)가 같은 값을 쓴다.
// 44는 정체 컬럼의 최소 높이(브랜드 19 + gap 6 + 이름 19)와 같고 BD-5 useless 로고 마크와도
// 같은 크기라, 썸네일이 붙은 행만 키가 커지는 일이 없다. 행 컨테이너의 minHeight 근거이기도 하다.
export const GEAR_THUMBNAIL_SIZE = 44;

// 이 컴포넌트는 두 세대의 화면이 함께 쓴다 — 크기(=행 높이 계약)만 공유하고 면·모서리는 갈린다.
type ThumbnailVariant = 'liquid' | 'legacy';

interface Props {
  // 사용자가 올린 본인 사진 URL(`users/{uid}/gears/{id}.imageUrl`).
  // 카탈로그·Algolia·공유 배낭 경로는 데이터 레이어에서 이미 비워 오므로(DataModel §1 비공개 원칙)
  // 뷰는 값의 출처를 따지지 않고 "있으면 그린다"만 지킨다.
  imageUrl: string | undefined;
  // 배치 전용(간격·투명도). 크기·radius는 이 컴포넌트가 단독으로 관리해야 행 높이 계약
  // (GEAR_THUMBNAIL_SIZE 기준 minHeight)이 깨지지 않으므로, 호출부가 덮어쓸 수 없도록
  // 받는 속성 자체를 좁힌다 — 넓은 ImageStyle을 받으면 뒤에 병합돼 width/height도 바뀐다.
  style?: StyleProp<Pick<ImageStyle, 'marginRight' | 'opacity'>>;
  /**
   * 어느 세대의 화면에 놓이는지. 기본은 `legacy`(각진 ACG 면) — 아직 이식하지 않은 화면이
   * 다수라 기본값을 Liquid로 두면 구세대 행에 Liquid 값이 조용히 새어 든다.
   * Liquid로 이식한 화면(창고 WH-1 · 배낭 상세 BD-1 · 패킹 PK-2)이 명시적으로 켠다.
   */
  variant?: ThumbnailVariant;
}

// WH-1 / BD-1 장비 목록 행의 정사각 썸네일.
// 사진이 없으면 **빈 박스나 플레이스홀더를 남기지 않고 아무것도 렌더하지 않는다** — 좌측을 비워
// 텍스트 우선 행 레이아웃을 그대로 쓰기 위해서다.
const GearThumbnailView: FC<Props> = ({
  imageUrl,
  style,
  variant = 'legacy',
}) => {
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);

  const handleError = () => {
    setFailedUrl(imageUrl);
  };

  // 로드 실패는 이미지 없음과 동일하게 처리한다(WH-1 — 깨진 아이콘 금지).
  // 실패 플래그 대신 실패한 URL 자체를 기억한다 — 리스트 행이 재사용돼 다른 장비가 들어오면
  // 그 장비는 다시 시도해야 하기 때문이다.
  if (!imageUrl || failedUrl === imageUrl) {
    return null;
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={[
        styles.thumbnail,
        variant === 'liquid' ? styles.liquid : styles.legacy,
        style,
      ]}
      resizeMode='cover'
      onError={handleError}
    />
  );
};

const styles = StyleSheet.create({
  // 크기만 두 세대가 공유한다 — 행 높이 계약(minContentHeight)이 이 값에 걸려 있다.
  thumbnail: {
    width: GEAR_THUMBNAIL_SIZE,
    height: GEAR_THUMBNAIL_SIZE,
  },
  // 배경은 로드 중 잠깐 보이는 자리색 — 로드 실패 시엔 컴포넌트 자체가 사라지므로 남지 않는다.
  // 가라앉은 면(`surfaceSunken`)이라 흰 카드 위에서 사진이 도착할 자리로만 읽힌다.
  liquid: {
    borderRadius: LiquidRadius.thumb,
    backgroundColor: Liquid.surfaceSunken,
  },
  // 구세대(ACG) 행 — 각진 면이 그 세대의 문법이다. 한 화면 안에서 두 세대를 섞지 않는다.
  legacy: {
    borderRadius: Radius.listThumb,
    backgroundColor: Color.thumbBg,
  },
});

export default GearThumbnailView;
