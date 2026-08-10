import { FC, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';
import { Liquid, LiquidRadius } from '@/constants/DesignTokens';

// 목록 행 썸네일 한 변(pt). 창고(WH-1)와 배낭 상세(BD-1)가 같은 값을 쓴다.
// 44는 정체 컬럼의 최소 높이(브랜드 19 + gap 6 + 이름 19)와 같고 BD-5 useless 로고 마크와도
// 같은 크기라, 썸네일이 붙은 행만 키가 커지는 일이 없다. 행 컨테이너의 minHeight 근거이기도 하다.
export const GEAR_THUMBNAIL_SIZE = 44;

interface Props {
  // 사용자가 올린 본인 사진 URL(`users/{uid}/gears/{id}.imageUrl`).
  // 카탈로그·Algolia·공유 배낭 경로는 데이터 레이어에서 이미 비워 오므로(DataModel §1 비공개 원칙)
  // 뷰는 값의 출처를 따지지 않고 "있으면 그린다"만 지킨다.
  imageUrl: string | undefined;
  // 배치 전용(간격·투명도). 크기·radius는 이 컴포넌트가 단독으로 관리해야 행 높이 계약
  // (GEAR_THUMBNAIL_SIZE 기준 minHeight)이 깨지지 않으므로, 호출부가 덮어쓸 수 없도록
  // 받는 속성 자체를 좁힌다 — 넓은 ImageStyle을 받으면 뒤에 병합돼 width/height도 바뀐다.
  style?: StyleProp<Pick<ImageStyle, 'marginRight' | 'opacity'>>;
}

// WH-1 / BD-1 장비 목록 행의 정사각 썸네일.
// 사진이 없으면 **빈 박스나 플레이스홀더를 남기지 않고 아무것도 렌더하지 않는다** — 좌측을 비워
// 텍스트 우선 행 레이아웃을 그대로 쓰기 위해서다.
// **면·모서리는 Liquid Depth 하나뿐이다**(2026-08-11): 구세대(ACG) 각진 면을 골라 쓰던
// `variant`는 마지막 소비처(탐색 목록 행)가 이식되면서 사라졌다 — 이 행을 쓰는 화면이 모두
// 같은 세대라 갈래를 남길 이유가 없다.
const GearThumbnailView: FC<Props> = ({ imageUrl, style }) => {
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
      style={[styles.thumbnail, style]}
      resizeMode='cover'
      onError={handleError}
    />
  );
};

const styles = StyleSheet.create({
  // 배경은 로드 중 잠깐 보이는 자리색 — 로드 실패 시엔 컴포넌트 자체가 사라지므로 남지 않는다.
  // 가라앉은 면(`surfaceSunken`)이라 흰 카드 위에서 사진이 도착할 자리로만 읽힌다.
  thumbnail: {
    width: GEAR_THUMBNAIL_SIZE,
    height: GEAR_THUMBNAIL_SIZE,
    borderRadius: LiquidRadius.thumb,
    backgroundColor: Liquid.surfaceSunken,
  },
});

export default GearThumbnailView;
