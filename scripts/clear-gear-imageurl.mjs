// /gear 카탈로그의 imageUrl 값을 일괄 제거한다(장비 이미지 미제공 원칙 — specs/DataModel.md §1 운영 절차 ①).
//   앱은 imageUrl을 읽지도 쓰지도 않으므로 값만 빈 문자열('')로 비운다. Algolia에는 익스텐션이 자동 전파한다.
// --apply 일 때만 실제 쓰기. 항상 백업 먼저 저장한다(DM-12 관례).
//
// 사용법:
//   node scripts/clear-gear-imageurl.mjs           # DRY-RUN: 백업 + 대상 수만 확인
//   node scripts/clear-gear-imageurl.mjs --apply   # 백업 후 실제 일괄 갱신
//
// admin 키가 없어 클라이언트 SDK + public config로 동작한다(/gear는 보안 규칙상 미인증 쓰기 허용).
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
// Firestore writeBatch 상한(500)보다 여유 있게 잡는다.
const BATCH_SIZE = 450;

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

// 실데이터에 문자열이 아닌 잔존 값(boolean true 등)도 있어 타입을 가리지 않고 비어있지 않으면 대상으로 본다.
const hasImageUrl = value =>
  value !== undefined && value !== null && String(value).trim() !== '';

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}`);

const snapshot = await getDocs(collection(db, 'gear'));
const targets = [];

snapshot.forEach(gearDoc => {
  const data = gearDoc.data();

  if (hasImageUrl(data.imageUrl)) {
    targets.push({
      id: gearDoc.id,
      name: data.name ?? '',
      nameKorean: data.nameKorean ?? '',
      imageUrl: data.imageUrl,
    });
  }
});

console.log(`전체 /gear 문서: ${snapshot.size}개`);
console.log(`imageUrl 보유(제거 대상): ${targets.length}개`);

// 대상이 없으면 백업을 쓰기 전에 종료한다 — 빈 배열이 기존 백업을 덮어쓰는 사고를 막는다.
if (targets.length === 0) {
  console.log('제거할 imageUrl이 없습니다. 종료.');
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/backup-gear-imageurl-${timestamp}.json`;

writeFileSync(backupPath, JSON.stringify(targets, null, 2));
console.log(`백업 저장: ${backupPath} (제거 전 원본 ${targets.length}건)`);

if (!APPLY) {
  console.log('DRY-RUN 종료. 실제 적용하려면 --apply 를 붙여 재실행하세요.');
  process.exit(0);
}

// 권한 검증 — 첫 건만 먼저 써 보고 실패하면 중단한다(백업은 이미 저장됨).
try {
  const first = targets[0];
  const probe = writeBatch(db);

  probe.update(doc(db, 'gear', first.id), { imageUrl: '' });
  await probe.commit();
  console.log(`  ✅ 권한 OK (${first.id} 적용)`);
} catch (e) {
  console.error('  ❌ 쓰기 실패. 중단.', e?.code || '', e?.message || e);
  process.exit(1);
}

let batch = writeBatch(db);
let inBatch = 0;
let done = 1;

for (let i = 1; i < targets.length; i++) {
  batch.update(doc(db, 'gear', targets[i].id), { imageUrl: '' });
  inBatch++;
  done++;

  if (inBatch >= BATCH_SIZE) {
    await batch.commit();
    console.log(`  진행: ${done}/${targets.length}`);
    batch = writeBatch(db);
    inBatch = 0;
  }
}

if (inBatch > 0) {
  await batch.commit();
}

console.log(`✅ 완료: ${done}/${targets.length} 문서 imageUrl 제거`);
process.exit(0);
