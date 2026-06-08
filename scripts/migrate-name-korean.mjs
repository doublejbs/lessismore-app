// /gear 카탈로그 마이그레이션:
//   조건: name 비어있지 않음 AND nameKorean 비어있음/필드없음
//   동작: nameKorean = name, name = ''
//   둘 다 있으면 스킵, name 비어있으면 스킵.
// --apply 플래그가 있을 때만 실제 쓰기. 항상 백업 파일을 먼저 저장한다.
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const isEmpty = v => v === undefined || v === null || String(v).trim() === '';
const nonEmpty = v => !isEmpty(v);

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);

const snap = await getDocs(collection(db, 'gear'));
console.log(`/gear 총 문서: ${snap.size}`);

const targets = [];
snap.forEach(d => {
  const data = d.data();
  if (nonEmpty(data.name) && isEmpty(data.nameKorean)) {
    targets.push({ id: d.id, name: data.name, prevNameKorean: data.nameKorean ?? null });
  }
});

console.log(`마이그레이션 대상: ${targets.length}개`);

// 백업 파일 저장 (항상)
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-gear-namekorean-${ts}.json`;
writeFileSync(backupPath, JSON.stringify(targets, null, 2));
console.log(`백업 저장: ${backupPath} (${targets.length}건의 id/name/prevNameKorean)`);

if (!APPLY) {
  console.log('DRY-RUN 종료. 실제 적용하려면 --apply 플래그를 붙이세요.');
  process.exit(0);
}

// 단일 문서로 쓰기 권한 먼저 검증
console.log('쓰기 권한 검증 (첫 문서 1건 시도)...');
try {
  const first = targets[0];
  const b = writeBatch(db);
  b.update(doc(db, 'gear', first.id), { nameKorean: first.name, name: '' });
  await b.commit();
  console.log(`  ✅ 권한 OK (${first.id} 적용됨)`);
} catch (e) {
  console.error('  ❌ 쓰기 실패 — 권한 또는 보안 규칙 문제. 중단합니다.');
  console.error('  ', e?.code || '', e?.message || e);
  process.exit(1);
}

// 나머지 배치 처리 (첫 건은 이미 처리됨)
let batch = writeBatch(db);
let inBatch = 0;
let done = 1;
for (let i = 1; i < targets.length; i++) {
  const t = targets[i];
  batch.update(doc(db, 'gear', t.id), { nameKorean: t.name, name: '' });
  inBatch++;
  done++;
  if (inBatch >= 450) {
    await batch.commit();
    console.log(`  ... ${done}/${targets.length} 적용`);
    batch = writeBatch(db);
    inBatch = 0;
  }
}
if (inBatch > 0) {
  await batch.commit();
}

console.log(`✅ 완료: ${done}/${targets.length} 문서 마이그레이션 (nameKorean=name, name='')`);
process.exit(0);
