import { FC } from 'react';
import MapControlButtonView from '@/components/map/MapControlButtonView';
import { MY_LOCATION_BLUE } from '@/components/map/MyLocationColor';
import app from '@/model/app/App';
import MyLocationMode from '@/model/location/MyLocationMode';

interface Props {
  mode: MyLocationMode;
  // ① 단계(내 위치로 이동)의 접근성 라벨 — 화면마다 이미 쓰던 문구를 그대로 둔다.
  locateLabel: string;
  onPress: () => void;
}

/**
 * 지도 `내 위치` 버튼 (BD-11 · GRP-10 방향 모드). 누를 때마다 ① 내 위치로 → ② 방향 모드 →
 * ③ 끄기를 돈다(`useMyLocationHeadingMode`).
 *
 * - 방향 모드에서는 **나침반 아이콘 + 파랑**이다. 켜진 상태를 색 하나로만 말하지 않도록 아이콘
 *   모양도 바꾼다(HIG — 색만으로 정보를 전하지 않는다). 파랑은 내 위치 점과 같은 의미색이다.
 * - 접근성 라벨은 **누르면 일어날 일**이다: 내 위치로 이동 → `방향 보기` → `방향 끄기`.
 */
const MapMyLocationButtonView: FC<Props> = ({ mode, locateLabel, onPress }) => {
  const l10n = app.getL10n();

  if (mode === MyLocationMode.Heading) {
    return (
      <MapControlButtonView
        icon='compass'
        iconColor={MY_LOCATION_BLUE}
        accessibilityLabel={l10n.t('app.location.hideHeading')}
        onPress={onPress}
      />
    );
  }

  return (
    <MapControlButtonView
      icon='locate'
      accessibilityLabel={
        mode === MyLocationMode.Located
          ? l10n.t('app.location.showHeading')
          : locateLabel
      }
      onPress={onPress}
    />
  );
};

export default MapMyLocationButtonView;
