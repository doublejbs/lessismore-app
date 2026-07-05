// CSV(rank,count,gearId,company,name,coupangUrl)의 coupangUrl을 /gear/{gearId}.coupangUrl에 기록한다.
//   coupangUrl이 빈 행은 건너뛴다. --apply 일 때만 실제 쓰기. 항상 백업 먼저 저장.
//   사용: node scripts/set-coupang-url.mjs [csv경로] [--apply]
//   기본 csv경로: ~/Desktop/useless-top100-coupang.csv
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const APPLY = process.argv.includes('--apply');
const csvPath =
  process.argv.find(a => a.endsWith('.csv')) ??
  `${homedir()}/Desktop/useless-top100-coupang.csv`;

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

// 따옴표 필드를 처리하는 한 줄 CSV 파서
const parseLine = line => {
  const cells = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }

  cells.push(cur);

  return cells;
};

const isEmpty = v => v === undefined || v === null || String(v).trim() === '';

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);
console.log(`CSV: ${csvPath}`);

const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const idIdx = header.indexOf('gearId');
const nameIdx = header.indexOf('name');
const urlIdx = header.indexOf('coupangUrl');

if (idIdx < 0 || urlIdx < 0) {
  console.error('CSV 헤더에 gearId / coupangUrl 열이 필요합니다.');
  process.exit(1);
}

const targets = [];

for (const line of lines.slice(1)) {
  const cells = parseLine(line);
  const gearId = cells[idIdx]?.trim();
  const coupangUrl = cells[urlIdx]?.trim();

  if (!isEmpty(gearId) && !isEmpty(coupangUrl)) {
    targets.push({ id: gearId, name: cells[nameIdx] ?? '', coupangUrl });
  }
}

console.log(`쓰기 대상(coupangUrl 채워진 행): ${targets.length}개`);

if (targets.length === 0) {
  console.log('채워진 링크가 없습니다. CSV의 coupangUrl 열을 채운 뒤 다시 실행하세요.');
  process.exit(0);
}

// 백업: 현재 gear/{id}의 coupangUrl(및 이름) 상태
const backup = [];

for (const t of targets) {
  const snap = await getDoc(doc(db, 'gear', t.id));

  backup.push({
    id: t.id,
    exists: snap.exists(),
    name: t.name,
    prevCoupangUrl: snap.exists() ? (snap.data().coupangUrl ?? null) : null,
    newCoupangUrl: t.coupangUrl,
  });
}

const missing = backup.filter(b => !b.exists);

if (missing.length > 0) {
  console.log(`⚠ 존재하지 않는 gear 문서 ${missing.length}개 (건너뜀):`);
  missing.forEach(m => console.log(`  ${m.id} ${m.name}`));
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-gear-coupang-${ts}.json`;
writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log(`백업 저장: ${backupPath}`);

console.log('\n미리보기(상위 10):');
backup
  .filter(b => b.exists)
  .slice(0, 10)
  .forEach(b =>
    console.log(`  ${b.id} ${b.name} ${b.prevCoupangUrl ? '(덮어씀)' : ''}`)
  );

if (!APPLY) {
  console.log('\nDRY-RUN 완료. 실제 쓰려면 --apply 를 붙이세요.');
  process.exit(0);
}

const batch = writeBatch(db);

backup
  .filter(b => b.exists)
  .forEach(b => {
    batch.update(doc(db, 'gear', b.id), { coupangUrl: b.newCoupangUrl });
  });

await batch.commit();

console.log(`\n★ 완료: ${backup.filter(b => b.exists).length}개 문서에 coupangUrl 기록`);
process.exit(0);
