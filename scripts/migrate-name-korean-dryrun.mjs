// 읽기 전용 드라이런: /gear 컬렉션에서 name/nameKorean 상태를 집계만 한다. 아무것도 쓰지 않는다.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

const snap = await getDocs(collection(db, 'gear'));
console.log(`/gear 총 문서: ${snap.size}`);

let both = 0; // name O, nameKorean O -> skip
let migrate = 0; // name O, nameKorean 비어있음/없음 -> 마이그레이션 대상
let nameEmpty = 0; // name 비어있음/없음 -> 처리 불가(스킵)
let fieldMissing = 0; // nameKorean 필드 자체가 없음 (migrate 중 세부)
const samples = [];

snap.forEach(d => {
  const data = d.data();
  const name = data.name;
  const nk = data.nameKorean;

  if (nonEmpty(name) && nonEmpty(nk)) {
    both++;
  } else if (nonEmpty(name) && isEmpty(nk)) {
    migrate++;
    if (!('nameKorean' in data)) fieldMissing++;
    if (samples.length < 8) {
      samples.push({ id: d.id, name, nameKorean: nk === undefined ? '(필드없음)' : nk });
    }
  } else {
    nameEmpty++;
  }
});

console.log('--- 분류 ---');
console.log(`① 둘 다 있음 (스킵)             : ${both}`);
console.log(`② name만 있음 → 마이그레이션 대상: ${migrate}  (그중 nameKorean 필드 자체 없음: ${fieldMissing})`);
console.log(`③ name 비어있음/없음 (스킵)      : ${nameEmpty}`);
console.log('--- 마이그레이션 대상 샘플 (최대 8) ---');
for (const s of samples) {
  console.log(`  ${s.id}  name=${JSON.stringify(s.name)}  nameKorean=${JSON.stringify(s.nameKorean)}`);
}
process.exit(0);
