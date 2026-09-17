import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { Ionicons } from '@expo/vector-icons';
import { Acg } from '@/constants/DesignTokens';
import GroupPoint from '@/model/group/GroupPoint';
import {
  getGroupPointTypeColor,
  getGroupPointTypeIcon,
} from '@/model/group-point/GroupPointLabels';

interface Props {
  point: GroupPoint;
  selected: boolean;
  onTapPoint: (point: GroupPoint) => void;
}

// 작은 마커도 잘 눌리도록 원(28pt)보다 넉넉한 탭 영역을 잡는다(박지 마커와 같은 값).
const HIT_AREA = 44;
const CIRCLE = 28;
const SELECTED_CIRCLE = 34;

/**
 * 지도 포인트 마커 1개 (GRP-9).
 *
 * 박지 마커(`CampSiteMarkerView`)와 같은 문법이다 — 유형 색 원 + 흰 테두리, 이름은 캡션으로
 * 위에 붙이고 겹치면 캡션만 숨긴다. 선택 마커는 캡션을 강제로 표시한다.
 * `memo`로 분리해 시트 오픈·칩 조작 때 마커 전체가 네이티브로 다시 동기화되지 않게 한다.
 */
const GroupPointMarkerView = memo<Props>(({ point, selected, onTapPoint }) => {
  const color = getGroupPointTypeColor(point.getType());
  const size = selected ? SELECTED_CIRCLE : CIRCLE;

  return (
    <NaverMapMarkerOverlay
      latitude={point.getLatitude()}
      longitude={point.getLongitude()}
      anchor={{ x: 0.5, y: 0.5 }}
      width={HIT_AREA}
      height={HIT_AREA}
      onTap={() => onTapPoint(point)}
      zIndex={selected ? 1 : 0}
      caption={{
        text: point.getTitle(),
        align: 'Top',
        textSize: selected ? 13 : 12,
        color: Acg.ink,
        haloColor: Acg.paper,
        offset: -6,
      }}
      isHideCollidedCaptions={!selected}
      isHideCollidedSymbols
    >
      {/* 커스텀 View 마커는 최상위 자식에 생김새 의존성을 key로 넘기고
          collapsable=false로 렌더를 보장해야 한다(라이브러리 요구사항). */}
      <View
        key={`${point.getId()}/${color}/${selected}`}
        collapsable={false}
        style={styles.hitArea}
      >
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
            selected && styles.circleSelected,
          ]}
        >
          <Ionicons
            name={getGroupPointTypeIcon(point.getType())}
            size={selected ? 18 : 15}
            color={Acg.paper}
          />
        </View>
      </View>
    </NaverMapMarkerOverlay>
  );
});

GroupPointMarkerView.displayName = 'GroupPointMarkerView';

const styles = StyleSheet.create({
  hitArea: {
    width: HIT_AREA,
    height: HIT_AREA,
    alignItems: 'center',
    justifyContent: 'center',
    // 아이콘의 투명 픽셀 영역 탭이 지도로 통과하지 않게 44pt 전체를 탭 표면으로 만든다.
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Acg.paper,
  },
  circleSelected: {
    borderWidth: 3,
    borderColor: Acg.ink,
  },
});

export default GroupPointMarkerView;
