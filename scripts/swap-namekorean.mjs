// /gear 중 name·nameKorean 둘 다 있고 nameKorean에 한글이 없는(영문) 케이스의 name↔nameKorean을 맞바꾼다.
//   swap 후: name=영문, nameKorean=한글  → 표시 로직(nameKorean||name)상 한글 노출.
// --apply 일 때만 실제 쓰기. 항상 백업 먼저 저장.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
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
const hasHangul = s => /[가-힣]/.test(s || '');

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);

const snap = await getDocs(collection(db, 'gear'));
const targets = [];
snap.forEach(d => {
  const data = d.data();
  if (nonEmpty(data.name) && nonEmpty(data.nameKorean) && !hasHangul(data.nameKorean)) {
    targets.push({ id: d.id, name: data.name, nameKorean: data.nameKorean });
  }
});

console.log(`swap 대상: ${targets.length}개`);

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-gear-swap-${ts}.json`;
writeFileSync(backupPath, JSON.stringify(targets, null, 2));
console.log(`백업 저장: ${backupPath} (swap 전 원본 id/name/nameKorean ${targets.length}건)`);

if (!APPLY) {
  console.log('DRY-RUN 종료. 실제 적용하려면 --apply.');
  process.exit(0);
}

// 권한 검증 (첫 건)
try {
  const f = targets[0];
  const b = writeBatch(db);
  b.update(doc(db, 'gear', f.id), { name: f.nameKorean, nameKorean: f.name });
  await b.commit();
  console.log(`  ✅ 권한 OK (${f.id} swap 적용)`);
} catch (e) {
  console.error('  ❌ 쓰기 실패. 중단.', e?.code || '', e?.message || e);
  process.exit(1);
}

let batch = writeBatch(db);
let inBatch = 0;
let done = 1;
for (let i = 1; i < targets.length; i++) {
  const t = targets[i];
  batch.update(doc(db, 'gear', t.id), { name: t.nameKorean, nameKorean: t.name });
  inBatch++;
  done++;
  if (inBatch >= 450) {
    await batch.commit();
    batch = writeBatch(db);
    inBatch = 0;
  }
}
if (inBatch > 0) await batch.commit();

console.log(`✅ 완료: ${done}/${targets.length} 문서 swap (name↔nameKorean)`);
process.exit(0);
