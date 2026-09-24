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
  // 보기 전용 지도(상세 지도 밴드, GRP-7)에서는 탭 대상이 밴드 전체라 넘기지 않는다.
  onTapPoint?: ((point: GroupPoint) => void) | undefined;
  /**
   * 작은 지도용 마커 — 원을 줄이고 캡션을 뗀다(GRP-7 상세 지도 밴드). 높이 110pt 밴드에
   * 캡션까지 달면 포인트 몇 개로 지도가 글자에 덮인다. 이름은 누르고 들어간 그룹 지도가 보여준다.
   */
  compact?: boolean;
}

// 작은 마커도 잘 눌리도록 원(28pt)보다 넉넉한 탭 영역을 잡는다(박지 마커와 같은 값).
const HIT_AREA = 44;
const CIRCLE = 28;
const SELECTED_CIRCLE = 34;
const COMPACT_CIRCLE = 18;
const COMPACT_ICON = 10;

/**
 * 지도 포인트 마커 1개 (GRP-9).
 *
 * 박지 마커(`CampSiteMarkerView`)와 같은 문법이다 — 유형 색 원 + 흰 테두리, 이름은 캡션으로
 * 위에 붙이고 겹치면 캡션만 숨긴다. 선택 마커는 캡션을 강제로 표시한다.
 * `memo`로 분리해 시트 오픈·칩 조작 때 마커 전체가 네이티브로 다시 동기화되지 않게 한다.
 */
const GroupPointMarkerView = memo<Props>(
  ({ point, selected, onTapPoint, compact = false }) => {
    const color = getGroupPointTypeColor(point.getType());
    const size = compact ? COMPACT_CIRCLE : selected ? SELECTED_CIRCLE : CIRCLE;
    const iconSize = compact ? COMPACT_ICON : selected ? 18 : 15;
    // 작은 마커는 탭을 받지 않으므로 히트 영역을 원 크기로 줄인다 — 44pt 캔버스가 지도 위에 겹친다.
    const canvas = compact ? COMPACT_CIRCLE : HIT_AREA;

    return (
      <NaverMapMarkerOverlay
        latitude={point.getLatitude()}
        longitude={point.getLongitude()}
        anchor={{ x: 0.5, y: 0.5 }}
        width={canvas}
        height={canvas}
        {...(onTapPoint ? { onTap: () => onTapPoint(point) } : {})}
        zIndex={selected ? 1 : 0}
        {...(compact
          ? {}
          : {
              caption: {
                text: point.getTitle(),
                align: 'Top' as const,
                textSize: selected ? 13 : 12,
                color: Acg.ink,
                haloColor: Acg.paper,
                offset: -6,
              },
            })}
        isHideCollidedCaptions={!selected}
        isHideCollidedSymbols
      >
        {/* 커스텀 View 마커는 최상위 자식에 생김새 의존성을 key로 넘기고
          collapsable=false로 렌더를 보장해야 한다(라이브러리 요구사항). */}
        <View
          key={`${point.getId()}/${color}/${selected}/${compact}`}
          collapsable={false}
          style={[styles.hitArea, { width: canvas, height: canvas }]}
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
              compact && styles.circleCompact,
              selected && !compact && styles.circleSelected,
            ]}
          >
            <Ionicons
              name={getGroupPointTypeIcon(point.getType())}
              size={iconSize}
              color={Acg.paper}
            />
          </View>
        </View>
      </NaverMapMarkerOverlay>
    );
  }
);

GroupPointMarkerView.displayName = 'GroupPointMarkerView';

const styles = StyleSheet.create({
  hitArea: {
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
  circleCompact: {
    borderWidth: 1.5,
  },
  circleSelected: {
    borderWidth: 3,
    borderColor: Acg.ink,
  },
});

export default GroupPointMarkerView;
