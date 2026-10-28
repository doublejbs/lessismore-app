import { FC } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { Acg } from '@/constants/DesignTokens';

interface Props {
  /** 핀 폭(pt). 높이는 원본 비율(30:40)로 따라온다. */
  width?: number;
  /** 채움·테두리·가운데 점 색. 기본은 박지 핀(라임 + 잉크). 그리기 검색의 임시 핀(RD-5)은 회색으로 바꾼다. */
  fill?: string;
  stroke?: string;
  dot?: string;
}

/**
 * 박지 핀 — 라임 채움 + 잉크 테두리·점(CS-2 선택 마커의 생김새).
 *
 * 지도 위 "여기"를 가리키는 앱 공통 마커의 단일 소스다. 동적 지도의 선택 마커
 * (`CampSiteSpotsLayerView`)와 Static Map 이미지 위 오버레이(BAG-1 카드 밴드, DST-8 미리보기)가
 * 함께 쓴다 — 정적 썸네일(MAP-3)은 지도만 굽고 마커는 **이미지 위에 이 SVG를 얹는다**
 * (`[이력]` NCP Static Map이 커스텀 아이콘을 렌더하지 않던 때 정한 방식을 그대로 쓴다).
 * 끝점이 좌표(이미지 중심)에 닿아야 하므로 오버레이 배치는 호출부가 앵커(y=1)를 책임진다.
 */
const SpotPinView: FC<Props> = ({
  width = 30,
  fill = Acg.lime,
  stroke = Acg.ink,
  dot = Acg.ink,
}) => {
  return (
    <Svg width={width} height={(width * 40) / 30} viewBox='0 0 30 40'>
      <Path
        d='M15 39 C15 39 28 23.5 28 14 A13 13 0 1 0 2 14 C2 23.5 15 39 15 39 Z'
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin='round'
      />
      <Circle cx={15} cy={14} r={4.6} fill={dot} />
    </Svg>
  );
};

export default SpotPinView;
