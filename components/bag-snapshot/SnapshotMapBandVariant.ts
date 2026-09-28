/**
 * 지도 밴드가 놓이는 자리. 모서리와 아래 여백이 여기서 갈린다 —
 * 카드 맨 위에 붙는 밴드는 위쪽 모서리만 둥글고, 홀로 놓이는 밴드는 네 모서리 전부다.
 */
enum SnapshotMapBandVariant {
  Card = 'Card',
  Standalone = 'Standalone',
}

export default SnapshotMapBandVariant;
