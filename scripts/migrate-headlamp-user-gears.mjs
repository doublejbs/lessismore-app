/**
 * 사용자 창고 사본(`users/{uid}/gears`)의 조명 카테고리를 카탈로그와 맞춘다 (DM-4).
 *
 * 카탈로그 `/gear`는 `migrate-headlamp-category.mjs`로 이미 옮겼지만, 창고에 담긴 사본은
 * 담을 당시 값을 그대로 갖고 있어 같은 장비가 카탈로그에서는 `헤드랜턴`, 내 창고에서는
 * `조명`으로 보인다. 그 불일치를 없앤다.
 *
 * 사용법:
 *   node scripts/migrate-headlamp-user-gears.mjs            # 조회만(기본)
 *   node scripts/migrate-headlamp-user-gears.mjs --apply    # 실제 반영
 *
 * collectionGroup 전수 스캔이라 where 필터를 쓰지 않는다(복합 인덱스 없이 돌리기 위함).
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collectionGroup,
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
const SOURCE_CATEGORIES = ['lighting', 'lantern'];

const db = getFirestore(initializeApp(config));

console.log('users/*/gears 전수 스캔 중...');
const snap = await getDocs(collectionGroup(db, 'gears'));
console.log(`총 ${snap.size.toLocaleString()}건`);

const byCategory = {};
const targets = [];

snap.forEach(d => {
  const g = d.data();
  const c = g.category ?? '(없음)';

  byCategory[c] = (byCategory[c] ?? 0) + 1;

  if (!SOURCE_CATEGORIES.includes(c)) {
    return;
  }

  const label = toLabel(g);
  const next = isHeadlamp(label) ? 'headlamp' : 'lighting';

  if (next !== c) {
    targets.push({ path: d.ref.path, label, from: c, to: next });
  }
});

console.log('\n=== 사용자 창고 카테고리 분포(상위) ===');
Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([k, v]) => console.log(`  ${String(k).padEnd(16)} ${String(v).padStart(5)}`));

console.log(`\n조명 계열: lighting ${byCategory.lighting ?? 0} · lantern ${byCategory.lantern ?? 0} · headlamp ${byCategory.headlamp ?? 0}`);
console.log(`변경 대상: ${targets.length}건`);

targets.forEach(t => console.log(`  ${t.from} → ${t.to}  ${t.label.slice(0, 60)}`));

if (!targets.length) {
  console.log('\n바꿀 문서가 없습니다.');
  process.exit(0);
}

if (!isApply) {
  console.log('\n조회 모드입니다. 실제 반영하려면 --apply 를 붙이세요.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-user-gears-lighting-${stamp}.json`;
writeFileSync(backupPath, JSON.stringify(targets, null, 2));
console.log(`\n백업 저장: ${backupPath}`);

for (let i = 0; i < targets.length; i += BATCH_SIZE) {
  const chunk = targets.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);

  chunk.forEach(t => {
    batch.update(doc(db, t.path), { category: t.to });
  });

  await batch.commit();
  console.log(`  ${Math.min(i + BATCH_SIZE, targets.length)}/${targets.length}`);
}

console.log('완료.');
process.exit(0);
