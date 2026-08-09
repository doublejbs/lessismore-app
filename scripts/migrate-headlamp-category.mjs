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

/**
 * 헤드랜턴 판정.
 *
 * 1차는 이름의 '헤드 + 램프/랜턴/라이트'다. 다만 **모델명만 적힌 상품은 이걸로 못 잡는다** —
 * 나이트코어 NU 시리즈, 블랙다이아몬드 코스모가 그렇다. 두 라인은 전 모델이 헤드랜턴이라
 * 브랜드+모델 규칙을 따로 둔다(BD 랜턴 라인은 모지·올빗·아폴로라 겹치지 않는다).
 */
const NAME_RULE = /헤드\s*(램프|랜턴|라이트)|head\s*(lamp|torch)|headlamp|headlight/i;
const MODEL_RULES = [
  /나이트코어.*\b(NU|HC)\s?\d/i,
  /블랙다이아몬드.*코스모/,
];

const isHeadlamp = label =>
  NAME_RULE.test(label) || MODEL_RULES.some(re => re.test(label));

const db = getFirestore(initializeApp(config));
const snap = await getDocs(
  query(collection(db, 'gear'), where('category', '==', 'lighting'))
);

const move = [];
const stay = [];

snap.forEach(d => {
  const g = d.data();
  const label = `${g.companyKorean ?? ''} ${g.nameKorean ?? ''} ${g.name ?? ''}`.trim();
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
