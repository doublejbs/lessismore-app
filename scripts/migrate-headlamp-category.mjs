/**
 * `lighting` 카테고리에서 헤드랜턴을 골라 `headlamp`로 옮긴다 (DM-4).
 *
 * 사용법:
 *   node scripts/migrate-headlamp-category.mjs            # 조회만(기본) — 판정 결과 출력
 *   node scripts/migrate-headlamp-category.mjs --apply    # 실제 반영
 *
 * 실행 전 대상 문서 백업 JSON을 scripts/에 남긴다(레포 관례).
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { isHeadlamp, toLabel } from './lib/HeadlampRule.mjs';

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const isApply = process.argv.includes('--apply');
const BATCH_SIZE = 400;

const db = getFirestore(initializeApp(config));
const snap = await getDocs(
  query(collection(db, 'gear'), where('category', '==', 'lighting'))
);

const move = [];
const stay = [];

snap.forEach(d => {
  const g = d.data();
  const label = toLabel(g);
  const row = { id: d.id, label, category: g.category };

  (isHeadlamp(label) ? move : stay).push(row);
});

console.log(`lighting 총 ${snap.size}건`);
console.log(`  → headlamp 이동 : ${move.length}건`);
console.log(`  → lighting 유지 : ${stay.length}건`);

console.log('\n=== 이동 대상 ===');
move
  .map(r => r.label)
  .sort()
  .forEach(l => console.log(`  ${l.slice(0, 70)}`));

if (!isApply) {
  console.log('\n조회 모드입니다. 실제 반영하려면 --apply 를 붙이세요.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-lighting-${stamp}.json`;
writeFileSync(backupPath, JSON.stringify({ move, stay }, null, 2));
console.log(`\n백업 저장: ${backupPath}`);

for (let i = 0; i < move.length; i += BATCH_SIZE) {
  const chunk = move.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);

  chunk.forEach(r => {
    batch.update(doc(db, 'gear', r.id), { category: 'headlamp' });
  });

  await batch.commit();
  console.log(`  ${Math.min(i + BATCH_SIZE, move.length)}/${move.length}`);
}

console.log('완료.');
process.exit(0);
