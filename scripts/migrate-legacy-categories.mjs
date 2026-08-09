/**
 * 레거시 세분 키(`furniture`·`cooking`)를 세분 카테고리로 이관한다 (DM-4).
 *
 * **카탈로그(`/gear`)와 사용자 창고(`users/{uid}/gears`)를 함께** 처리한다 — 한쪽만 고치면
 * 같은 장비가 카탈로그와 내 창고에서 다르게 보인다(헤드랜턴 이관에서 겪은 문제).
 *
 * 사용법:
 *   node scripts/migrate-legacy-categories.mjs            # 조회만(기본)
 *   node scripts/migrate-legacy-categories.mjs --apply    # 실제 반영
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import {
  splitCooking,
  splitFurniture,
  toLabel,
} from './lib/CategorySplitRules.mjs';

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

const classify = (category, label) => {
  if (category === 'furniture') {
    return splitFurniture(label);
  }

  if (category === 'cooking') {
    return splitCooking(label);
  }

  return null;
};

const db = getFirestore(initializeApp(config));

const collect = (snap, pathOf) => {
  const rows = [];

  snap.forEach(d => {
    const g = d.data();
    const from = g.category;
    const label = toLabel(g);
    const to = classify(from, label);

    if (to && to !== from) {
      rows.push({ path: pathOf(d), label, from, to });
    }
  });

  return rows;
};

console.log('카탈로그 /gear 스캔...');
const catalog = collect(
  await getDocs(collection(db, 'gear')),
  d => `gear/${d.id}`
);

console.log('사용자 창고 users/*/gears 스캔...');
const userGears = collect(
  await getDocs(collectionGroup(db, 'gears')),
  d => d.ref.path
);

const all = [...catalog, ...userGears];

const report = rows => {
  const byPair = {};

  rows.forEach(r => {
    const k = `${r.from} → ${r.to}`;
    byPair[k] = (byPair[k] ?? 0) + 1;
  });

  Object.entries(byPair)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`    ${k.padEnd(28)} ${String(v).padStart(5)}`));
};

console.log(`\n=== 카탈로그 ${catalog.length}건 ===`);
report(catalog);
console.log(`\n=== 사용자 창고 ${userGears.length}건 ===`);
report(userGears);

console.log('\n=== 식기류 기타/그 외 기타로 떨어진 항목 (규칙 점검용, 최대 40) ===');
all
  .filter(r => r.to === 'cookware_etc' || r.to === 'furniture_etc')
  .slice(0, 40)
  .forEach(r => console.log(`  ${r.to.padEnd(14)} ${r.label.slice(0, 62)}`));

if (!all.length) {
  console.log('\n바꿀 문서가 없습니다.');
  process.exit(0);
}

if (!isApply) {
  console.log(`\n총 ${all.length}건. 조회 모드입니다. 반영하려면 --apply 를 붙이세요.`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-legacy-categories-${stamp}.json`;
writeFileSync(backupPath, JSON.stringify(all, null, 2));
console.log(`\n백업 저장: ${backupPath}`);

for (let i = 0; i < all.length; i += BATCH_SIZE) {
  const chunk = all.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);

  chunk.forEach(r => {
    batch.update(doc(db, r.path), { category: r.to });
  });

  await batch.commit();
  console.log(`  ${Math.min(i + BATCH_SIZE, all.length)}/${all.length}`);
}

console.log('완료.');
process.exit(0);
