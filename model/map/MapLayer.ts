// MAP-7: 지도 종류. 기기에 기억하는 값(`map.layer`)과 측정 `click_map_layer`의 `layer` 값이 같다.
enum MapLayer {
  // `useless-outdoor` 그대로(MAP-1).
  Standard = 'standard',
  // Esri World Imagery 위성 + 라벨·길 레이어(useless 플러스 혜택, SUB-13).
  Satellite = 'satellite',
}

export default MapLayer;
