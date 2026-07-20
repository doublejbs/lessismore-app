// 큐레이션 박지 좌표 교정 (CampSite CS-4 데이터, DataModel DM-17)
//   시드 원본의 일부 좌표가 소수점 2자리로 뭉개져 있어 실제 위치에서 수 km 벗어나고,
//   그 결과 인접 시·군(때로는 다른 도)으로 떨어진다. 웹 검색으로 실제 주소를 확인하고
//   Kakao 주소/키워드 검색으로 정확한 좌표를 다시 구해 교정한다.
//
//   교정 대상은 아래 CORRECTIONS 표에 명시된 건만이다(전수 재지오코딩이 아니다).
//   /camp-spot 문서와 scripts/camp-spots-curated.json 을 함께 고쳐, 재시드해도 되돌아가지 않게 한다.
//
//   실행: node scripts/fix-camp-spot-coordinates.mjs           (DRY-RUN, 쓰기 안 함)
//         node scripts/fix-camp-spot-coordinates.mjs --apply   (실제 쓰기)
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

const APPLY = process.argv.includes('--apply');

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

// sourceKey(=curated slug) → 교정 좌표. 근거는 웹 검색으로 확인한 실제 주소이며,
// 좌표는 그 주소를 Kakao 주소/키워드 검색으로 지오코딩해 얻었다.
const CORRECTIONS = {
  'samcheok-deokpung-valley': {
    latitude: 37.09361,
    longitude: 129.18686,
    // 강원 삼척시 가곡면 풍곡리 66 — 기존 좌표(37.05/129.24)는 경북 울진군으로 떨어졌다.
    note: '강원 삼척시 가곡면 풍곡리',
  },
  'goesan-suok-valley': {
    latitude: 36.80643,
    longitude: 128.0274,
    // 충북 괴산군 연풍면 수옥정1길 23 — 기존 좌표(36.78/128.06)는 경북 문경시로 떨어졌다.
    note: '충북 괴산군 연풍면',
  },
  'sangju-janggak-valley': {
    latitude: 36.5418,
    longitude: 127.91566,
    // 경북 상주시 화북면 상오3길 52 — 기존 좌표(36.55/127.87)는 충북 보은군으로 떨어졌다.
    note: '경북 상주시 화북면',
  },
  'gosapo-beach': {
    latitude: 35.66389,
    longitude: 126.51037,
    // 전북 부안군 변산면 노루목길 8-8 — 기존 좌표(36.664/126.453)는 충남 서산시로 떨어졌다.
    note: '전북 부안군 변산면',
  },
};

const here = dirname(fileURLToPath(import.meta.url));
const curatedPath = join(here, 'camp-spots-curated.json');

const run = async () => {
  const db = getFirestore(initializeApp(config));
  const snap = await getDocs(collection(db, 'camp-spot'));

  const targets = [];

  snap.forEach(d => {
    const data = d.data();
    const fix = CORRECTIONS[data.sourceKey];

    if (!fix || data.source !== 'curated') {
      return;
    }

    targets.push({ id: d.id, name: data.name, before: data.location, fix });
  });

  console.log(`전체 ${snap.size}건 중 교정 대상 ${targets.length}건`);

  targets.forEach(t => {
    console.log(
      `  ${t.name}: (${t.before.latitude}, ${t.before.longitude}) → (${t.fix.latitude}, ${t.fix.longitude})  [${t.fix.note}]`
    );
  });

  const missing = Object.keys(CORRECTIONS).filter(
    key => !targets.some(t => CORRECTIONS[key] === t.fix)
  );

  if (missing.length > 0) {
    console.warn(`  ⚠ 문서를 못 찾은 sourceKey: ${missing.join(', ')}`);
  }

  if (!APPLY) {
    console.log('\nDRY-RUN 종료. 실제 쓰려면 --apply 를 붙이세요.');

    return;
  }

  // 되돌릴 수 있게 교정 전 좌표를 먼저 남긴다.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(here, `backup-camp-spot-coords-${stamp}.json`);

  writeFileSync(
    backupPath,
    JSON.stringify(
      targets.map(t => ({ id: t.id, name: t.name, location: t.before })),
      null,
      2
    )
  );
  console.log(`\n백업 저장: ${backupPath}`);

  for (const t of targets) {
    await updateDoc(doc(db, 'camp-spot', t.id), {
      location: { latitude: t.fix.latitude, longitude: t.fix.longitude },
    });
    console.log(`  updated ${t.name}`);
  }

  // 시드 원본도 함께 고쳐야 재시드 시 되돌아가지 않는다.
  const curated = JSON.parse(readFileSync(curatedPath, 'utf8'));
  let curatedFixed = 0;

  curated.forEach(spot => {
    const fix = CORRECTIONS[spot.slug];

    if (!fix) {
      return;
    }

    spot.location = { latitude: fix.latitude, longitude: fix.longitude };
    curatedFixed += 1;
  });

  writeFileSync(curatedPath, `${JSON.stringify(curated, null, 2)}\n`);
  console.log(`camp-spots-curated.json ${curatedFixed}건 갱신`);
};

run()
  .then(() => process.exit(0))
  .catch(error => {
    if (String(error?.code).includes('permission-denied')) {
      console.error(
        '\n쓰기 권한이 없습니다. Firebase 콘솔에서 /camp-spot 쓰기 규칙을 임시 허용한 뒤 다시 실행하세요.'
      );
      process.exit(0);
    }

    console.error(error);
    process.exit(1);
  });
