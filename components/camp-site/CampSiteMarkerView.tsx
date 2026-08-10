import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Liquid, LiquidShadow } from '@/constants/DesignTokens';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { getCampSiteTypeColor } from '@/model/camp-site/CampSiteLabels';

interface Props {
  spot: CampSpot;
  selected: boolean;
  onTapSpot: (spot: CampSpot) => void;
}

// 박지 마커 1개(CS-2). memo로 분리해 요약 카드 오픈 등 지도 화면의
// 다른 상태 변경 시 마커 전체가 리렌더(네이티브 동기화)되지 않게 한다 —
// 마커 탭 → 카드 표시 지연의 원인이었다. props(spot 참조·콜백)가 같으면 건너뛴다.
// 비선택 마커의 탭 영역. 원(16pt)보다 넉넉히 잡아 작은 마커도 잘 눌리게 한다.
const HIT_AREA = 44;
// 선택 핀 크기(목업 §4).
const PIN_WIDTH = 34;
const PIN_HEIGHT = 44;

const CampSiteMarkerView = memo<Props>(({ spot, selected, onTapSpot }) => {
  return (
    <NaverMapMarkerOverlay
      latitude={spot.location.latitude}
      longitude={spot.location.longitude}
      // 선택 마커는 핀이라 **끝점이 좌표에 닿아야** 한다(anchor y=1). 비선택 원은
      // 중심이 좌표다.
      anchor={selected ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
      width={selected ? PIN_WIDTH : HIT_AREA}
      height={selected ? PIN_HEIGHT : HIT_AREA}
      onTap={() => onTapSpot(spot)}
      // 선택 마커는 다른 마커 캡션 위로 그려지도록 zIndex를 올린다 — 겹침에서 선택 캡션이 이긴다.
      zIndex={selected ? 1 : 0}
      // 박지 이름 캡션(CS-2) — 마커 위쪽 표시, 흰 halo로 지도 위 가독성 확보.
      // 44pt 히트 영역(원은 중앙 16pt) 밖에 붙으므로 음수 offset으로 원에 가깝게 당긴다.
      caption={{
        text: spot.name,
        // 비선택 원은 이름을 **위**에, 선택 핀은 **아래**에 둔다(목업 §4) — 핀은 머리가
        // 굵어 위에 두면 이름이 핀에 눌리고, 핀 아래는 좌표 지점이라 이름이 핀을 가리지 않는다.
        align: selected ? 'Bottom' : 'Top',
        // 선택 시 마커가 커지므로 캡션도 살짝 키운다.
        textSize: selected ? 13 : 12,
        // 목업은 라벨에 흰 텍스트 섀도 3중을 걸지만, 네이티브 캡션은 배경 대신 글자 halo만
        // 지원한다. 커스텀 뷰로 라벨을 그리면 면은 얻지만 겹침 자동 숨김
        // (isHideCollidedCaptions)을 잃어 밀집 구간에서 이름이 서로 포개진다 — 기능을 지키고
        // halo로 섀도 3중을 대신한다.
        color: Liquid.ink,
        // halo는 글자 테두리라 라임을 주면 글자에 형광 번짐처럼 붙어 지저분했다
        // (2026-08-04 사용자 지적). 선택 표시는 핀 쪽 라임 면이 맡는다.
        haloColor: Liquid.surface,
        // 음수 offset은 캡션을 마커 쪽으로 당긴다. 원(중심 앵커)은 당겨야 붙지만,
        // 핀은 앵커가 끝점이라 아래로 조금 띄워야 좌표 지점과 겹치지 않는다.
        offset: selected ? 4 : -8,
      }}
      // 겹치는 마커는 캡션만 숨긴다(마커 자체는 유지). 단, **선택(탭)한 마커는 캡션을 강제로 표시**한다 —
      // 줌·밀집으로 이름이 숨겨졌던 마커도 탭하면 이름이 보이게(선택 마커만 겹침 숨김 해제).
      isHideCollidedCaptions={!selected}
      // 마커와 겹치는 기본 지도 심볼(산 정상 POI 등)은 숨긴다 — 이중 라벨을 정리하고,
      // 심볼이 마커 탭을 가로채 반응이 없어 보이는 문제를 막는다.
      isHideCollidedSymbols
    >
      {/* 44pt 히트 영역 안에 16pt 원 — 작은 마커의 탭 인식률 확보(선택 시에는 핀 자체가 영역).
          커스텀 View 마커는 최상위 자식에 생김새 의존성(색)을 key로 넘기고
          collapsable=false로 렌더를 보장해야 한다(라이브러리 요구사항). */}
      <View
        key={`${spot.id}/${getCampSiteTypeColor(spot.type)}/${selected}`}
        collapsable={false}
        style={selected ? styles.pinArea : styles.markerHitArea}
      >
        {/* 선택 마커는 **지도 관행대로 핀**이다(2026-08-04 사용자 결정). 원을 키우는 방식은
            "선택됨"보다 "다른 종류의 마커"로 읽혔다. 채움은 라임 — 앱의 유일한 액센트이고,
            그 박지의 유형은 바로 아래 시트가 배지로 말한다.
            시선 유도 펄스·카메라 포커스는 지도 화면이 담당한다. */}
        {selected ? (
          <Svg width={PIN_WIDTH} height={PIN_HEIGHT} viewBox='0 0 34 44'>
            <Path
              d='M17 43s14-17 14-26A14 14 0 1 0 3 17c0 9 14 26 14 26z'
              fill={Liquid.lime}
              stroke={Liquid.ink}
              strokeWidth={2}
              strokeLinejoin='round'
            />
            <Circle cx={17} cy={16} r={5} fill={Liquid.ink} />
          </Svg>
        ) : (
          <View
            style={[
              styles.marker,
              { backgroundColor: getCampSiteTypeColor(spot.type) },
            ]}
          />
        )}
      </View>
    </NaverMapMarkerOverlay>
  );
});

CampSiteMarkerView.displayName = 'CampSiteMarkerView';

const styles = StyleSheet.create({
  // 핀은 자기 크기가 곧 영역이라 별도 히트 영역을 두지 않는다(투명 배경도 불필요).
  pinArea: {
    width: PIN_WIDTH,
    height: PIN_HEIGHT,
  },
  markerHitArea: {
    width: HIT_AREA,
    height: HIT_AREA,
    alignItems: 'center',
    justifyContent: 'center',
    // 사실상 보이지 않는 배경 — 아이콘 이미지의 투명 픽셀 영역 탭이 아래 심볼/지도로
    // 통과하지 않게 44pt 전체를 탭 표면으로 만든다(원(16pt) 밖을 눌러도 마커가 반응).
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  // 원 16pt + 흰 2.5px 테두리 + 그림자(목업 §4). 채움색은 유형 의미색이라 그대로 둔다.
  // 그림자는 지도 타일 위 예외 토큰이다(지면용 잉크 그림자는 지형 위에서 묻힌다).
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: Liquid.surface,
    boxShadow: LiquidShadow.markerOnMap,
  },
});

export default CampSiteMarkerView;
