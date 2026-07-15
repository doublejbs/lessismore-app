import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Color } from '@/constants/DesignTokens';
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
const CampSiteMarkerView = memo<Props>(({ spot, selected, onTapSpot }) => {
  return (
    <NaverMapMarkerOverlay
      latitude={spot.location.latitude}
      longitude={spot.location.longitude}
      anchor={{ x: 0.5, y: 0.5 }}
      width={44}
      height={44}
      onTap={() => onTapSpot(spot)}
      // 박지 이름 캡션(CS-2) — 마커 위쪽 표시, 흰 halo로 지도 위 가독성 확보.
      // 44pt 히트 영역(원은 중앙 20pt) 밖에 붙으므로 음수 offset으로 원에 가깝게 당긴다.
      caption={{
        text: spot.name,
        align: 'Top',
        // 선택 시 마커가 커지므로 캡션을 조금 더 위로 올리고 살짝 키운다.
        textSize: selected ? 13 : 12,
        color: Color.textPrimary,
        haloColor: Color.background,
        offset: selected ? -12 : -8,
      }}
      // 겹치는 마커는 캡션만 숨긴다(마커 자체는 유지).
      isHideCollidedCaptions
      // 마커와 겹치는 기본 지도 심볼(산 정상 POI 등)은 숨긴다 — 이중 라벨을 정리하고,
      // 심볼이 마커 탭을 가로채 반응이 없어 보이는 문제를 막는다.
      isHideCollidedSymbols
    >
      {/* 44pt 히트 영역 안에 20pt 원 — 작은 마커의 탭 인식률 확보.
          커스텀 View 마커는 최상위 자식에 생김새 의존성(색)을 key로 넘기고
          collapsable=false로 렌더를 보장해야 한다(라이브러리 요구사항). */}
      <View
        key={`${spot.id}/${getCampSiteTypeColor(spot.type)}/${selected}`}
        collapsable={false}
        style={styles.markerHitArea}
      >
        {selected ? (
          // 선택 상태: 검정 강조 링(앱의 활성=검정 언어) + 흰 테두리 + 크게 → 명확히 구분·팝업.
          <View style={styles.selectedOuter}>
            <View
              style={[
                styles.selectedInner,
                { backgroundColor: getCampSiteTypeColor(spot.type) },
              ]}
            />
          </View>
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
  markerHitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // 사실상 보이지 않는 배경 — 아이콘 이미지의 투명 픽셀 영역 탭이 아래 심볼/지도로
    // 통과하지 않게 44pt 전체를 탭 표면으로 만든다(원(20pt) 밖을 눌러도 마커가 반응).
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Color.background,
  },
  // 선택 마커 바깥 검정 링(활성=검정). 그림자로 다른 마커 위에 떠 보이게 한다.
  selectedOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  // 링 안 유형색 원 + 흰 테두리(유형 정보 유지).
  selectedInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Color.background,
  },
});

export default CampSiteMarkerView;
