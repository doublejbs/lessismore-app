// 박지 시/군/구(city) 백필 (DataModel DM-17)
//   /camp-spot 전 문서의 location(위경도)으로 Kakao coord2regioncode를 호출해
//   region_1depth_name을 축약 표기로 정규화한 region과 region_2depth_name인 city를 채운다.
//   좌표가 진실이므로 큐레이션 원본 region과 다르면 좌표 결과로 덮어쓴다.
//   앱 Firestore(lessismore-7e070) 쓰기라 클라이언트 SDK + public config 사용(admin 키 불필요).
//   /camp-spot 은 기본 보안 규칙상 클라이언트 쓰기가 막혀 있을 수 있다 →
//   permission-denied 시 콘솔에서 규칙 임시 허용이 필요하다는 안내를 출력하고 정상 종료한다.
//
//   ※ --apply 시 scripts/camp-spots-curated.json 의 region/city 도 함께 맞춰, 재시드해도
//      되돌아가지 않게 한다(--curated-only 로 이 동기화만 따로 돌릴 수도 있다). 과거에는 seed-camp-spots.mjs 로
//     재시드하면 city 가 다시 비고 region 도 원본 값으로 되돌아가므로 이 백필을 다시 돌려야 한다.
//
//   실행: node scripts/backfill-camp-spot-city.mjs           (DRY-RUN, 쓰기 안 함)
//         node scripts/backfill-camp-spot-city.mjs --apply   (실제 쓰기)
//         node scripts/backfill-camp-spot-city.mjs --curated-only  (시드 원본만 Firestore 기준으로 동기화)
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';

const APPLY = process.argv.includes('--apply');
// 시드 원본만 맞추는 모드 — Kakao 재호출 없이 이미 적재된 Firestore 값을 진실로 삼는다.
const CURATED_ONLY = process.argv.includes('--curated-only');

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const KAKAO_COORD2REGION_URL =
  'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json';
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;

// 호출 간 간격(ms) — Kakao 로컬 API 레이트리밋 배려.
const REQUEST_INTERVAL_MS = 30;

// 시도명 축약표(DM-17). Kakao가 주는 새 명칭을 기준으로 하며,
// 전남·광주 통합 신설명(전남광주통합특별시)은 `전남광주`로 줄인다.
const REGION_SHORT_NAME = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원특별자치도: '강원',
  강원도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전북특별자치도: '전북',
  전라북도: '전북',
  전라남도: '전남',
  전남광주통합특별시: '전남광주',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
};

if (!KAKAO_REST_KEY) {
  console.error(
    'Kakao REST 키가 없습니다. .env 에 EXPO_PUBLIC_KAKAO_REST_KEY 를 설정하세요.'
  );
  process.exit(1);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));

// 시드 원본(camp-spots-curated.json)의 region/city 를 Firestore 값에 맞춘다.
// 이걸 안 하면 seed-camp-spots.mjs 재실행 시 city 가 날아가고 region 이 옛 값으로 되돌아간다.
// 매칭 키는 시드 멱등성 키와 동일한 slug(=sourceKey)다.
const syncCurated = async db => {
  const curatedPath = join(scriptDir, 'camp-spots-curated.json');
  const curated = JSON.parse(readFileSync(curatedPath, 'utf8'));
  const snap = await getDocs(collection(db, 'camp-spot'));
  const bySlug = new Map();

  snap.forEach(d => {
    const data = d.data();

    if (data.source === 'curated' && data.sourceKey) {
      bySlug.set(data.sourceKey, data);
    }
  });

  let changed = 0;
  let missing = 0;

  curated.forEach(spot => {
    const stored = bySlug.get(spot.slug);

    if (!stored) {
      missing += 1;

      return;
    }

    if (spot.region !== stored.region || spot.city !== stored.city) {
      changed += 1;
    }

    spot.region = stored.region;

    if (stored.city) {
      spot.city = stored.city;
    } else {
      delete spot.city;
    }
  });

  writeFileSync(curatedPath, `${JSON.stringify(curated, null, 2)}\n`);
  console.log(
    `camp-spots-curated.json 동기화: ${curated.length}건 중 ${changed}건 변경` +
      (missing > 0 ? ` (Firestore에서 못 찾음 ${missing}건)` : '')
  );
};

// --curated-only 는 Firestore 조회만 하고 끝낸다.
if (CURATED_ONLY) {
  await syncCurated(getFirestore(initializeApp(config)));
  process.exit(0);
}

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 표에 없는 시도명은 임의로 줄이지 않고 원문 그대로 두되 경고를 남긴다(신설 행정구역 대응).
const unknownRegionNames = new Set();

const toShortRegion = fullName => {
  const short = REGION_SHORT_NAME[fullName];

  if (short) {
    return short;
  }

  unknownRegionNames.add(fullName);

  return fullName;
};

// 좌표 → 행정구역(시도/시군구). 행정동(H) 기준 문서를 우선 쓰고 없으면 첫 문서.
const fetchRegion = async (latitude, longitude) => {
  const url = `${KAKAO_COORD2REGION_URL}?x=${longitude}&y=${latitude}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`Kakao coord2regioncode 실패: ${res.status}`);
  }

  const json = await res.json();
  const documents = json?.documents ?? [];
  const picked = documents.find(d => d.region_type === 'H') ?? documents[0];

  if (!picked) {
    return null;
  }

  return {
    region: toShortRegion(String(picked.region_1depth_name ?? '').trim()),
    city: String(picked.region_2depth_name ?? '').trim(),
  };
};

// ── 1. 전 문서 로드 ────────────────────────────────────────────────
const snap = await getDocs(collection(db, 'camp-spot'));
const docs = [];

snap.forEach(d => {
  docs.push({ id: d.id, data: d.data() });
});

console.log(`총 ${docs.length}개 문서`);

// ── 2. 좌표 → 행정구역 조회 ────────────────────────────────────────
const updates = []; // { id, name, before: {region, city}, after: {region, city} }
const failures = []; // { id, name, reason }
let regionChanged = 0;
let cityAdded = 0;
let checked = 0;

for (const d of docs) {
  const { latitude, longitude } = d.data.location ?? {};

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    failures.push({ id: d.id, name: d.data.name, reason: '좌표 없음' });
    continue;
  }

  let resolved = null;

  try {
    resolved = await fetchRegion(latitude, longitude);
  } catch (error) {
    failures.push({ id: d.id, name: d.data.name, reason: String(error) });
    continue;
  }

  if (!resolved || !resolved.region) {
    failures.push({ id: d.id, name: d.data.name, reason: '행정구역 없음' });
    continue;
  }

  checked += 1;

  const beforeRegion = d.data.region ?? '';
  const beforeCity = d.data.city ?? '';
  const isRegionChanged = resolved.region !== beforeRegion;
  const isCityChanged = resolved.city !== beforeCity;

  if (isRegionChanged || isCityChanged) {
    if (isRegionChanged) {
      regionChanged += 1;
    }

    if (isCityChanged && !beforeCity) {
      cityAdded += 1;
    }

    updates.push({
      id: d.id,
      name: d.data.name,
      before: { region: beforeRegion, city: beforeCity },
      after: { region: resolved.region, city: resolved.city },
    });
  }

  if (checked % 50 === 0) {
    console.log(`  ... ${checked}/${docs.length} 조회`);
  }

  await sleep(REQUEST_INTERVAL_MS);
}

// ── 3. 요약 출력 ───────────────────────────────────────────────────
console.log(`\n조회 성공 ${checked}건 / 실패 ${failures.length}건`);
console.log(
  `변경 대상 ${updates.length}건 (region 변경 ${regionChanged}건, city 신규 부여 ${cityAdded}건)`
);

if (unknownRegionNames.size > 0) {
  console.log(
    `\n⚠ 축약표에 없는 시도명 ${unknownRegionNames.size}종 — 원문 그대로 저장됩니다:`
  );
  console.log(`  ${[...unknownRegionNames].join(', ')}`);
}

if (failures.length > 0) {
  console.log('\n실패 목록:');
  failures.forEach(f => {
    console.log(`  ${f.name} (${f.id}): ${f.reason}`);
  });
}

if (!APPLY) {
  console.log('\n변경 목록:');
  updates.forEach(u => {
    const before = `${u.before.region} ${u.before.city}`.trim() || '(없음)';
    const after = `${u.after.region} ${u.after.city}`.trim();
    console.log(`  ${u.name}: ${before} → ${after}`);
  });
  console.log('\nDRY-RUN 종료. 실제 쓰려면 --apply 를 붙이세요.');
  process.exit(0);
}

if (updates.length === 0) {
  console.log('\n변경할 문서가 없습니다.');
  process.exit(0);
}

// ── 4. 백업 후 쓰기 ────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(scriptDir, `backup-camp-spot-city-${ts}.json`);
writeFileSync(backupPath, JSON.stringify(docs, null, 2));
console.log(`\n백업: ${backupPath}`);

let done = 0;

for (const u of updates) {
  const payload = { region: u.after.region };

  // city 가 비면 필드를 새로 만들지 않는다(옵셔널 — 빈 문자열 저장 금지).
  if (u.after.city) {
    payload.city = u.after.city;
  }

  try {
    await updateDoc(doc(db, 'camp-spot', u.id), payload);
  } catch (error) {
    if (String(error).includes('permission-denied')) {
      console.error(
        '\n쓰기 권한이 없습니다(permission-denied). Firebase 콘솔에서 /camp-spot 쓰기 규칙을 임시로 허용한 뒤 다시 실행하세요.'
      );
      process.exit(0);
    }

    throw error;
  }

  done += 1;

  if (done % 50 === 0) {
    console.log(`  ... ${done}/${updates.length} 반영`);
  }
}

console.log(`\n★ 완료: ${done}개 문서 갱신`);

await syncCurated(db);
process.exit(0);
