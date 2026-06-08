// 읽기 전용: /gear 중 name·nameKorean 둘 다 있고, nameKorean에 한글이 없는(영문으로 보이는) 케이스를 나열.
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
const hasHangul = s => /[가-힣]/.test(s || '');

const app = initializeApp(config);
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'gear'));

const both = [];
snap.forEach(d => {
  const data = d.data();
  if (nonEmpty(data.name) && nonEmpty(data.nameKorean)) {
    both.push({ id: d.id, name: data.name, nameKorean: data.nameKorean });
  }
});

const swapped = both.filter(x => !hasHangul(x.nameKorean)); // nameKorean에 한글 없음 = 영문
const ok = both.filter(x => hasHangul(x.nameKorean));

console.log(`둘 다 있는 문서: ${both.length}`);
console.log(`  - nameKorean 한글 있음(정상): ${ok.length}`);
console.log(`  - nameKorean 영문(거꾸로 추정): ${swapped.length}`);
console.log('=== nameKorean이 영문인 목록 (전체) ===');
swapped
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  .forEach((x, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${x.id}`);
    console.log(`    name       = ${JSON.stringify(x.name)}`);
    console.log(`    nameKorean = ${JSON.stringify(x.nameKorean)}`);
  });
process.exit(0);
