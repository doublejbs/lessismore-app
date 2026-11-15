// 지도 스타일 레이어 id 검사 (Map MAP-7 위성 보기)
//   위성 보기는 스타일 JSON을 다시 받지 않고 `useless-outdoor`의 레이어 id로 위성 래스터를 끼우고 면 채움을 숨긴다
//   (`model/map/SatelliteBasemap.ts`의 `SATELLITE_BEFORE_LAYER_ID`·`SATELLITE_HIDDEN_LAYERS`). 스타일 버전을 올리면
//   (`outdoor-v{n}.json`) 이 id들이 새 스타일에 그대로 있는지 이 스크립트로 확인한다.
//
// 사용법 (저장소 루트에서):
//   node scripts/check-map-style-layers.mjs                       # 기본: https://lessismore-7e070.web.app/map/outdoor-v1.json
//   node scripts/check-map-style-layers.mjs <스타일 JSON URL>     # 다른 버전·로컬 서버
//
// 결과: 모든 id가 있고 타입이 같으면 exit 0. 빠진 id·타입이 다른 레이어가 있으면 목록을 찍고 exit 1.
//   기준 레이어는 숨김 레이어(배경·면 채움 쪽)보다 위에 있어야 하므로 그 순서도 검사한다(숨김 중 도로·건물 채움 3개 제외).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_STYLE_URL = 'https://lessismore-7e070.web.app/map/outdoor-v1.json';
// 기준 레이어 위에 있어도 되는 숨김 레이어(위성 위에서 숨기는 채움).
const ABOVE_BEFORE_ALLOWED = new Set(['road_area_pattern', 'building', 'building-3d']);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'model/map/SatelliteBasemap.ts'), 'utf8');

const beforeMatch = source.match(/SATELLITE_BEFORE_LAYER_ID\s*=\s*'([^']+)'/);
const hiddenBlock = source.match(/SATELLITE_HIDDEN_LAYERS[\s\S]*?=\s*\[([\s\S]*?)\];/);

if (!beforeMatch || !hiddenBlock) {
  console.error('SatelliteBasemap.ts에서 레이어 상수를 찾지 못했어요');
  process.exit(1);
}

const beforeId = beforeMatch[1];
const hidden = [...hiddenBlock[1].matchAll(/id:\s*'([^']+)',\s*type:\s*'([^']+)'/g)].map(
  ([, id, type]) => ({ id, type })
);
const url = process.argv[2] ?? DEFAULT_STYLE_URL;
const response = await fetch(url);

if (!response.ok) {
  console.error(`스타일을 받지 못했어요: ${response.status} ${url}`);
  process.exit(1);
}

let style;

try {
  style = await response.json();
} catch {
  console.error(`스타일 JSON이 아니에요: ${url}`);
  process.exit(1);
}

const layers = Array.isArray(style.layers) ? style.layers : [];
const indexById = new Map(layers.map((layer, index) => [layer.id, index]));
const problems = [];

if (!indexById.has(beforeId)) {
  problems.push(`기준 레이어 없음: ${beforeId}`);
}

for (const { id, type } of hidden) {
  const index = indexById.get(id);

  if (index === undefined) {
    problems.push(`숨김 레이어 없음: ${id}`);
    continue;
  }

  if (layers[index].type !== type) {
    problems.push(`타입 다름: ${id} (코드 ${type}, 스타일 ${layers[index].type})`);
  }

  if (
    indexById.has(beforeId) &&
    index > indexById.get(beforeId) &&
    !ABOVE_BEFORE_ALLOWED.has(id)
  ) {
    problems.push(`숨김 레이어가 기준 레이어 위에 있음: ${id}`);
  }
}

console.log(`스타일: ${url} (레이어 ${layers.length}개)`);
console.log(`기준 레이어: ${beforeId}, 숨김 레이어 ${hidden.length}개`);

if (problems.length > 0) {
  problems.forEach(problem => console.error(`- ${problem}`));
  process.exit(1);
}

console.log('모든 레이어 id가 있어요');
