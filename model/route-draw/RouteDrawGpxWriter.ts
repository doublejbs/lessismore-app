import { RouteCoordinate } from '@/model/route/RouteData';

export interface RouteDrawGpxInput {
  name: string;
  // `<trk><desc>` — 이 코스가 지도에 점을 찍어 만든 것임을 남긴다(RD-3 · §4, 데이터 계약에는 출처 필드가 없다).
  description: string;
  time: Date;
  coordinates: readonly RouteCoordinate[];
}

const CREATOR = 'useless';
// 좌표는 소수 6자리(약 0.1m)로 쓴다(RD-3 4번).
const COORDINATE_DIGITS = 6;

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, char => XML_ESCAPES[char] ?? char);

const toTrackPoint = (coordinate: RouteCoordinate): string => {
  const lat = coordinate.lat.toFixed(COORDINATE_DIGITS);
  const lon = coordinate.lng.toFixed(COORDINATE_DIGITS);

  // 고도는 정수 m. 고도를 못 읽었으면 `<ele>`를 쓰지 않는다 — 파서가 "고도 없음"으로 읽는다.
  if (coordinate.ele === undefined) {
    return `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`;
  }

  return `      <trkpt lat="${lat}" lon="${lon}"><ele>${Math.round(coordinate.ele)}</ele></trkpt>`;
};

/**
 * 그린 코스의 GPX 1.1 문서 (RD-3 4번). 가져온 GPX와 같은 원본 파일로 Storage에 올라가 내보내기·그룹 복사가
 * 그대로 쓴다 — 그래서 `GpxParser`가 다시 읽을 수 있는 모양(`<trk><name>` · `<trkpt lat lon>` · `<ele>`)이어야 한다.
 */
export const writeRouteDrawGpx = (input: RouteDrawGpxInput): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="${CREATOR}" xmlns="http://www.topografix.com/GPX/1/1">`,
    '  <metadata>',
    `    <time>${input.time.toISOString()}</time>`,
    '  </metadata>',
    '  <trk>',
    `    <name>${escapeXml(input.name)}</name>`,
    `    <desc>${escapeXml(input.description)}</desc>`,
    '    <trkseg>',
    ...input.coordinates.map(toTrackPoint),
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
