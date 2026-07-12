// 박지 시드 적재 (CampSite CS-4 데이터, DataModel DM-17)
//   /camp-spot 컬렉션에 큐레이션 시드 + (선택) 고캠핑 API 스냅샷을 upsert 한다.
//   - 큐레이션: scripts/camp-spots-curated.json (백패킹 노지·대피소, 수동 검수 대상)
//   - 고캠핑: GOCAMPING_KEY env 가 있을 때만 한국관광공사 basedList 조회 → campground 유형
//   문서 id: curated:{slug} / gocamping:{contentId} (upsert 멱등)
//   앱 Firestore(lessismore-7e070) 쓰기이므로 클라이언트 SDK + public config 사용(admin 키 불필요).
//   /camp-spot 은 기본 보안 규칙상 클라이언트 쓰기가 막혀 있을 수 있다 →
//   permission-denied 시 콘솔에서 규칙 임시 허용이 필요하다는 안내를 출력하고 정상 종료한다.
//
//   실행: node scripts/seed-camp-spots.mjs           (DRY-RUN, 쓰기 안 함)
//         node scripts/seed-camp-spots.mjs --apply   (실제 쓰기)
//         GOCAMPING_KEY=... node scripts/seed-camp-spots.mjs --apply   (고캠핑 포함)
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const GOCAMPING_KEY = process.env.GOCAMPING_KEY;

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const scriptDir = dirname(fileURLToPath(import.meta.url));

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);

const isEmpty = v => v === undefined || v === null || String(v).trim() === '';

// 옵셔널 필드는 값이 있을 때만 넣는다(빈 문자열/undefined 저장 금지).
const withOptional = (target, key, value) => {
  if (!isEmpty(value)) {
    target[key] = String(value).trim();
  }
};

// DM-17 CampSiteType 유효값 — 수기 JSON 오타 방어.
const VALID_TYPES = ['campground', 'shelter', 'wild'];

// ── 1. 큐레이션 시드 로드 ──────────────────────────────────────────
const loadCuratedSpots = () => {
  const raw = readFileSync(join(scriptDir, 'camp-spots-curated.json'), 'utf8');
  const items = JSON.parse(raw);
  const now = new Date().toISOString();

  return items.map(item => {
    if (!VALID_TYPES.includes(item.type)) {
      throw new Error(`유효하지 않은 type: ${item.type} (${item.name})`);
    }

    const document = {
      name: item.name,
      type: item.type,
      location: {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
      },
      region: item.region,
      description: item.description,
      facilities: Array.isArray(item.facilities) ? item.facilities : [],
      source: 'curated',
      status: 'active',
      updatedAt: now,
    };

    withOptional(document, 'accessInfo', item.accessInfo);
    withOptional(document, 'warnings', item.warnings);
    withOptional(document, 'imageUrl', item.imageUrl);

    // 지형·특징 태그(DM-17 tags) — 비어있지 않은 배열일 때만 영속.
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      document.tags = item.tags;
    }

    // 좌표 검수 플래그(needsVerification)는 소스 JSON에만 둔다 —
    // DM-17 계약 외 필드를 Firestore에 영속하지 않는다(카탈로그는 계약 필드만).

    return { id: `curated:${item.slug}`, document };
  });
};

// ── 2. 고캠핑 API 스냅샷 (키 있을 때만) ─────────────────────────────
// 부대시설(sbrsCl)·바닥유형(siteBottomCl4=데크) 문자열에서 매핑 가능한 시설만 추출.
const mapGoCampingFacilities = item => {
  const facilities = [];
  const sbrs = String(item.sbrsCl || '');
  const toiletCount = Number(item.toiletCo) || 0;

  if (sbrs.includes('화장실') || toiletCount > 0) {
    facilities.push('toilet');
  }

  if (sbrs.includes('온수') || sbrs.includes('개수대') || sbrs.includes('음수')) {
    facilities.push('water');
  }

  if (sbrs.includes('마트') || sbrs.includes('편의점') || sbrs.includes('매점')) {
    facilities.push('store');
  }

  if ((Number(item.siteBottomCl4) || 0) > 0) {
    facilities.push('deck');
  }

  return facilities;
};

const fetchGoCampingSpots = async () => {
  if (isEmpty(GOCAMPING_KEY)) {
    console.log('GOCAMPING_KEY 없음 → 고캠핑 스냅샷 스킵(큐레이션만 진행).');
    return [];
  }

  const url =
    'https://apis.data.go.kr/B551011/GoCamping/basedList' +
    `?serviceKey=${GOCAMPING_KEY}` +
    '&numOfRows=5000&pageNo=1&MobileOS=ETC&MobileApp=lessismore&_type=json';

  console.log('고캠핑 basedList 조회 중...');

  const res = await fetch(url);

  if (!res.ok) {
    console.error(`  ❌ 고캠핑 API 응답 실패: HTTP ${res.status} → 고캠핑 스킵.`);
    return [];
  }

  const json = await res.json();
  const rawItems = json?.response?.body?.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  console.log(`  고캠핑 원본 항목: ${items.length}개`);

  const now = new Date().toISOString();
  const spots = [];
  let skipped = 0;
  let filteredOut = 0;

  // v1 마커 상한(CampSite.md §8 수백 건 이내)을 지키기 위한 필터:
  // 일반야영장 × 공공 관리주체(국립/공립/지자체/국립공원/자연휴양림)만 적재.
  // 민간 글램핑·카라반은 백패킹 정체성과 거리가 있어 제외.
  const PUBLIC_DIVISIONS = ['국립', '공립', '지자체', '자연휴양림'];

  for (const item of items) {
    const latitude = Number(item.mapY);
    const longitude = Number(item.mapX);
    const contentId = item.contentId;

    if (
      isEmpty(contentId) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      (latitude === 0 && longitude === 0)
    ) {
      skipped += 1;
      continue;
    }

    const induty = String(item.induty || '');
    const division = String(item.facltDivNm || '');

    if (
      !induty.includes('일반야영장') ||
      !PUBLIC_DIVISIONS.some(d => division.includes(d))
    ) {
      filteredOut += 1;
      continue;
    }

    const document = {
      name: item.facltNm || '',
      type: 'campground',
      location: { latitude, longitude },
      region: item.doNm || '',
      description: item.lineIntro || item.intro || '',
      facilities: mapGoCampingFacilities(item),
      source: 'gocamping',
      status: 'active',
      updatedAt: now,
    };

    withOptional(document, 'accessInfo', item.direction);
    withOptional(document, 'imageUrl', item.firstImageUrl);

    spots.push({ id: `gocamping:${contentId}`, document });
  }

  console.log(`  좌표/식별자 누락으로 스킵: ${skipped}개`);
  console.log(`  필터 제외(민간/글램핑·카라반 등): ${filteredOut}개`);
  console.log(`  매핑된 고캠핑 박지: ${spots.length}개`);

  return spots;
};

// ── 3. 기존 데이터 백업 ────────────────────────────────────────────
const backupExisting = async () => {
  const snap = await getDocs(collection(db, 'camp-spot'));
  const existing = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(scriptDir, `backup-camp-spot-${ts}.json`);
  writeFileSync(backupPath, JSON.stringify(existing, null, 2));

  console.log(`기존 /camp-spot 백업: ${backupPath} (${existing.length}건)`);

  return existing.length;
};

// ── 4. upsert (setDoc merge) ──────────────────────────────────────
const upsertSpots = async spots => {
  let written = 0;

  for (const spot of spots) {
    try {
      await setDoc(doc(db, 'camp-spot', spot.id), spot.document, {
        merge: true,
      });
      written += 1;

      if (written % 50 === 0) {
        console.log(`  ... ${written}/${spots.length} upsert`);
      }
    } catch (e) {
      if (e?.code === 'permission-denied') {
        console.error('\n❌ permission-denied — /camp-spot 클라이언트 쓰기가 막혀 있습니다.');
        console.error('   Firebase 콘솔에서 /camp-spot 쓰기 규칙을 임시 허용한 뒤 다시 실행하고,');
        console.error('   적재 완료 후 규칙을 원복(쓰기 금지)하세요. (gear 마이그레이션 관례)');
        console.error(`   (진행 상황: ${written}/${spots.length} 적용 후 중단)`);
        return { written, aborted: true };
      }

      throw e;
    }
  }

  return { written, aborted: false };
};

// ── 실행 흐름 ──────────────────────────────────────────────────────
const curated = loadCuratedSpots();
const gocamping = await fetchGoCampingSpots();
const all = [...curated, ...gocamping];

console.log(
  `\n적재 대상: 총 ${all.length}개 (큐레이션 ${curated.length} + 고캠핑 ${gocamping.length})`
);

const byType = all.reduce((acc, s) => {
  acc[s.document.type] = (acc[s.document.type] || 0) + 1;
  return acc;
}, {});
console.log(`유형별: ${JSON.stringify(byType)}`);

if (!APPLY) {
  console.log('\nDRY-RUN 종료(쓰기·백업 없음). 실제 적용하려면 --apply 플래그를 붙이세요.');
  process.exit(0);
}

// 실제 적용 시에만 기존 데이터를 백업한다.
await backupExisting();

const { written, aborted } = await upsertSpots(all);

console.log(
  `\n${aborted ? '⚠️ 중단' : '★ 완료'}: /camp-spot ${written}/${all.length}개 upsert.`
);
process.exit(0);
