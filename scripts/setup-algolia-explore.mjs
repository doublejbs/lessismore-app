// Algolia 탐색(Search SR-7~9) 설정 + 인기도(count) 동기화
//   1) 기본 인덱스에 facet 속성(category, companyKorean, filterOnly) + 정렬 replica 등록
//   2) 각 replica의 ranking 설정 (무게 asc/desc, 최신 createDate desc, 인기 count desc)
//   3) gear-rank.count 를 Algolia 레코드의 count 필드로 동기화 (인기순 정렬용)
//
//   Algolia Admin API 키가 필요하다(설정 변경·레코드 업데이트 권한). search-only 키로는 안 됨.
//   키는 절대 코드/레포에 넣지 말고 env로 전달한다:
//     ALGOLIA_ADMIN_API_KEY=xxxx node scripts/setup-algolia-explore.mjs           (DRY-RUN)
//     ALGOLIA_ADMIN_API_KEY=xxxx node scripts/setup-algolia-explore.mjs --apply    (실제 적용)
import { algoliasearch } from 'algoliasearch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');
const APP_ID = 'BWS6CWRXRM';
const INDEX = 'useless-gear-search';
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

if (!ADMIN_KEY) {
  console.error('환경변수 ALGOLIA_ADMIN_API_KEY 가 필요합니다 (Algolia 대시보드 → API Keys → Admin API Key).');
  process.exit(1);
}

const DEFAULT_RANKING = ['typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom'];
const REPLICAS = [
  { name: `${INDEX}_weight_asc`, ranking: ['asc(weight)', ...DEFAULT_RANKING] },
  { name: `${INDEX}_weight_desc`, ranking: ['desc(weight)', ...DEFAULT_RANKING] },
  { name: `${INDEX}_createDate_desc`, ranking: ['desc(createDate)', ...DEFAULT_RANKING] },
  { name: `${INDEX}_count_desc`, ranking: ['desc(count)', ...DEFAULT_RANKING] },
];

const client = algoliasearch(APP_ID, ADMIN_KEY);

console.log(`모드: ${APPLY ? '★ APPLY (실제 적용)' : 'DRY-RUN'}`);
console.log(`인덱스: ${INDEX}`);
console.log(`facet 속성: filterOnly(category), filterOnly(companyKorean)`);
console.log(`정렬 replica: ${REPLICAS.map(r => r.name).join(', ')}`);

// --- gear-rank.count 로드 (Firestore, public config) ---
const firebaseConfig = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};
const db = getFirestore(initializeApp(firebaseConfig));
const rankSnap = await getDocs(collection(db, 'gear-rank'));
const countUpdates = [];

rankSnap.forEach(d => {
  countUpdates.push({ objectID: d.id, count: Number(d.data().count) || 0 });
});

console.log(`\ngear-rank → Algolia count 동기화 대상: ${countUpdates.length}개 레코드`);

if (!APPLY) {
  console.log('\nDRY-RUN 종료. 실제 적용하려면 --apply. (미보유 장비는 count 미설정 → 인기순 하위 정렬)');
  process.exit(0);
}

// 1) 기본 인덱스 설정: facet + replica 목록
await client.setSettings({
  indexName: INDEX,
  indexSettings: {
    attributesForFaceting: ['filterOnly(category)', 'filterOnly(companyKorean)'],
    replicas: REPLICAS.map(r => r.name),
  },
});
console.log('✓ 기본 인덱스 facet/replica 설정 완료');

// 2) 각 replica ranking 설정
for (const replica of REPLICAS) {
  await client.setSettings({
    indexName: replica.name,
    indexSettings: { ranking: replica.ranking },
  });
  console.log(`✓ replica 설정: ${replica.name}`);
}

// 3) count 동기화 (배치 partialUpdate, 미존재 objectID는 무시)
let done = 0;

for (let i = 0; i < countUpdates.length; i += 1000) {
  const chunk = countUpdates.slice(i, i + 1000);

  await client.partialUpdateObjects({
    indexName: INDEX,
    objects: chunk,
    createIfNotExists: false,
  });

  done += chunk.length;
  console.log(`  count 동기화: ${done}/${countUpdates.length}`);
}

console.log('\n★ 완료: facet/replica 설정 + count 동기화. (Algolia 인덱싱 반영에 수 초~수 분 소요)');
process.exit(0);
