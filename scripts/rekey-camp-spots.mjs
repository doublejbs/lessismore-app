// /camp-spot 문서 id를 무작위 고유값(Firebase 자동 생성)으로 재키한다.
// 기존 id는 `{source}:{sourceKey}`(예: curated:seokseongsan) 형태 — 콜론이 공유 URL·
// 링크화에서 문제가 되고 읽히는 slug라, 무작위 id로 바꾸고 (source, sourceKey)는 필드로 보존한다.
// 시드 재실행 멱등성은 seed-camp-spots.mjs가 (source, sourceKey)로 매칭해 유지한다.
//
// 사용: node scripts/rekey-camp-spots.mjs          (DRY-RUN — 쓰기 없음)
//       node scripts/rekey-camp-spots.mjs --apply  (실제 재키 + 백업)
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const scriptDir = dirname(fileURLToPath(import.meta.url));

const config = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const app = initializeApp(config);
const db = getFirestore(app);

console.log(`모드: ${APPLY ? '★ APPLY (실제 재키)' : 'DRY-RUN (쓰기 없음)'}`);

const snap = await getDocs(collection(db, 'camp-spot'));
const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));

console.log(`총 ${docs.length}개 문서`);

// 재키 대상: id에 콜론이 있는(구형 {source}:{key}) 문서. 이미 무작위 id면 건너뛴다(멱등).
const targets = docs.filter(d => d.id.includes(':'));
const alreadyRandom = docs.length - targets.length;

console.log(`재키 대상: ${targets.length}개 / 이미 무작위(건너뜀): ${alreadyRandom}개`);

if (!APPLY) {
  const sample = targets.slice(0, 5).map(d => {
    const idx = d.id.indexOf(':');
    return `  ${d.id} → source=${d.id.slice(0, idx)} sourceKey=${d.id.slice(idx + 1)}`;
  });
  console.log('예시(앞 5개):');
  console.log(sample.join('\n'));
  console.log('\nDRY-RUN 종료. 실제 재키하려면 --apply 를 붙이세요.');
  process.exit(0);
}

// 백업 (재키 전 원본 id 포함).
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(scriptDir, `backup-camp-spot-rekey-${ts}.json`);
writeFileSync(backupPath, JSON.stringify(docs, null, 2));
console.log(`백업: ${backupPath}`);

const mapping = []; // { oldId, newId, source, sourceKey }
let done = 0;

for (const d of targets) {
  const idx = d.id.indexOf(':');
  const source = d.data.source ?? d.id.slice(0, idx);
  const sourceKey = d.id.slice(idx + 1);

  // 무작위 id 문서 생성(source·sourceKey 필드 보존), 구 문서 삭제.
  const newRef = doc(collection(db, 'camp-spot'));
  await setDoc(newRef, { ...d.data, source, sourceKey });
  await deleteDoc(doc(db, 'camp-spot', d.id));

  // 구 id로 남은 후기 캐시(camp-spot-review/{oldId})는 고아가 되므로 정리(best-effort).
  try {
    await deleteDoc(doc(db, 'camp-spot-review', d.id));
  } catch {
    // 없거나 실패해도 무시 — 새 id로 재조회되며 채워진다.
  }

  mapping.push({ oldId: d.id, newId: newRef.id, source, sourceKey });
  done += 1;

  if (done % 50 === 0) {
    console.log(`  ... ${done}/${targets.length} 재키`);
  }
}

const mapPath = join(scriptDir, `rekey-mapping-${ts}.json`);
writeFileSync(mapPath, JSON.stringify(mapping, null, 2));

console.log(`\n★ 완료: ${done}개 재키. 매핑: ${mapPath}`);
process.exit(0);
