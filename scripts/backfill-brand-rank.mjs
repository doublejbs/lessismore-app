// brand-rank 백필 (DataModel DM-14, Search SR-8)
//   /gear(카탈로그) × /gear-rank(보유수)를 브랜드로 묶어 brand-rank/{brandKey} 집계를 생성한다.
//   - ownerCount = 브랜드 소속 장비들의 gear-rank.count 합 (사용자 보유수 합계, 인기순 정렬 키)
//   - gearCount  = 브랜드의 카탈로그 제품 수 (/gear 기준)
//   brandKey = (companyKorean || company) trim + 소문자. 표시는 companyKorean || company.
//   --apply 일 때만 실제 쓰기. 항상 백업 먼저 저장.
//
//   실행: node scripts/backfill-brand-rank.mjs           (DRY-RUN)
//         node scripts/backfill-brand-rank.mjs --apply   (실제 쓰기)
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
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
// brandKey 정규화 — 앱(GearStore)의 규칙과 반드시 동일하게 유지할 것.
const toBrandKey = (companyKorean, company) => {
  const base = !isEmpty(companyKorean) ? companyKorean : company;

  if (isEmpty(base)) {
    return '';
  }

  return String(base).trim().toLowerCase();
};

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);

// 1) 카탈로그 전체 로드 → 브랜드별 제품 수(gearCount) + 표시명, gearId→brandKey 매핑
const gearSnap = await getDocs(collection(db, 'gear'));
const gearIdToBrandKey = new Map();
const brands = new Map(); // brandKey → { brandKey, companyKorean, company, ownerCount, gearCount }

gearSnap.forEach(d => {
  const data = d.data();
  const brandKey = toBrandKey(data.companyKorean, data.company);

  if (isEmpty(brandKey)) {
    return;
  }

  gearIdToBrandKey.set(d.id, brandKey);

  const existing = brands.get(brandKey);

  if (existing) {
    existing.gearCount += 1;

    if (isEmpty(existing.companyKorean) && !isEmpty(data.companyKorean)) {
      existing.companyKorean = data.companyKorean;
    }

    if (isEmpty(existing.company) && !isEmpty(data.company)) {
      existing.company = data.company;
    }
  } else {
    brands.set(brandKey, {
      brandKey,
      companyKorean: isEmpty(data.companyKorean) ? '' : data.companyKorean,
      company: isEmpty(data.company) ? '' : data.company,
      ownerCount: 0,
      gearCount: 1,
    });
  }
});

console.log(`카탈로그 장비: ${gearSnap.size}개, 브랜드: ${brands.size}개`);

// 2) gear-rank 로드 → 브랜드별 ownerCount 합산
const rankSnap = await getDocs(collection(db, 'gear-rank'));
let orphanRanks = 0;

rankSnap.forEach(d => {
  const data = d.data();
  const brandKey = gearIdToBrandKey.get(d.id);

  if (!brandKey) {
    orphanRanks += 1; // 카탈로그에 없거나 브랜드 없는 gear-rank
    return;
  }

  const brand = brands.get(brandKey);

  if (brand) {
    brand.ownerCount += Number(data.count) || 0;
  }
});

console.log(`gear-rank 문서: ${rankSnap.size}개 (브랜드 매칭 실패: ${orphanRanks}개)`);

const result = [...brands.values()].sort((a, b) => b.ownerCount - a.ownerCount);

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-brand-rank-${ts}.json`;
writeFileSync(backupPath, JSON.stringify(result, null, 2));
console.log(`백업/미리보기 저장: ${backupPath} (${result.length}개 브랜드)`);
console.log('상위 10개 (ownerCount desc):');
result.slice(0, 10).forEach((b, i) => {
  console.log(`  ${i + 1}. ${b.companyKorean || b.company} — 보유 ${b.ownerCount}, 제품 ${b.gearCount}`);
});

if (!APPLY) {
  console.log('\nDRY-RUN 종료. 실제 적용하려면 --apply.');
  process.exit(0);
}

// 3) brand-rank 쓰기 (배치 500개 단위)
let written = 0;

for (let i = 0; i < result.length; i += 500) {
  const chunk = result.slice(i, i + 500);
  const batch = writeBatch(db);

  chunk.forEach(b => {
    batch.set(doc(db, 'brand-rank', b.brandKey), {
      brandKey: b.brandKey,
      companyKorean: b.companyKorean,
      company: b.company,
      ownerCount: b.ownerCount,
      gearCount: b.gearCount,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  written += chunk.length;
  console.log(`  쓰기 진행: ${written}/${result.length}`);
}

console.log(`\n★ 완료: brand-rank ${written}개 문서 생성.`);
process.exit(0);
