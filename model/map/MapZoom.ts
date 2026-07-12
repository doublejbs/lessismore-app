import { Dimensions } from 'react-native';

// 웹 메르카토르 근사: 화면에 보이는 위도 스팬(도) ≈ 360 × (화면높이dp / 기준타일dp) / 2^zoom.
// 네이버 지도 SDK는 줌 기준 타일이 512dp다(256으로 계산 시 실측 대비 약 1레벨 더 줌인됨 — 시뮬레이터 실측 보정).
// (고위도 메르카토르 왜곡은 무시 — 남한 위도대에서 마커 표시 임계 용도로 충분한 정밀도)
// react-native-maps의 latitudeDelta 기반 코드에서 이식할 때 동일 체감 배율을 유지하기 위한 환산.
export const deltaToZoom = (latitudeDelta: number): number => {
  const { height } = Dimensions.get('window');

  return Math.log2((360 * height) / (512 * latitudeDelta));
};

// deltaToZoom의 역변환: 줌 레벨 → 화면에 보이는 위도 스팬(도).
export const zoomToDelta = (zoom: number): number => {
  const { height } = Dimensions.get('window');

  return (360 * height) / (512 * Math.pow(2, zoom));
};
