import { FC } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  /** 핀 폭(pt). 높이는 원본 비율(30:40)로 따라온다. */
  width?: number;
}

/**
 * 박지 핀 — 라임 채움 + 잉크 테두리·점(CS-2 선택 마커의 생김새).
 *
 * 지도 위 "여기"를 가리키는 앱 공통 마커의 단일 소스다. 동적 지도의 선택 마커
 * (`CampSiteMarkerView`)와 Static Map 이미지 위 오버레이(BAG-1 카드 밴드, DST-8 미리보기)가
 * 함께 쓴다 — NCP Static Map은 커스텀 아이콘 파라미터를 렌더하지 않아(2026-08-13 실측,
 * `icon:` 옵션이 기본 핀으로 폴백) 마커를 이미지에 싣는 대신 **이미지 위에 이 SVG를 얹는다**.
 * 끝점이 좌표(이미지 중심)에 닿아야 하므로 오버레이 배치는 호출부가 앵커(y=1)를 책임진다.
 */
const SpotPinView: FC<Props> = ({ width = 30 }) => {
  return (
    <Svg width={width} height={(width * 40) / 30} viewBox='0 0 30 40'>
      <Path
        d='M15 39 C15 39 28 23.5 28 14 A13 13 0 1 0 2 14 C2 23.5 15 39 15 39 Z'
        fill={Acg.lime}
        stroke={Acg.ink}
        strokeWidth={1.6}
        strokeLinejoin='round'
      />
      <Circle cx={15} cy={14} r={4.6} fill={Acg.ink} />
    </Svg>
  );
};

export default SpotPinView;
