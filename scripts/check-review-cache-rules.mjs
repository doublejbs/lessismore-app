// camp-spot-review 컬렉션에 미인증 클라이언트 읽기/쓰기가 허용되는지 확인하는 1회성 점검 스크립트.
// 사용: node scripts/check-review-cache-rules.mjs (scripts/ 밖에서 실행 시 firebase 모듈 해석 실패 주의 — 저장소 루트에서 실행)
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
const ref = doc(db, 'camp-spot-review', 'rules-test-tmp');

try {
  await setDoc(ref, { reviews: [], videos: [], updatedAt: new Date().toISOString() });
  console.log('쓰기: 허용');

  const snap = await getDoc(ref);
  console.log('읽기:', snap.exists() ? '허용 (문서 확인됨)' : '문서 없음?');

  await deleteDoc(ref);
  console.log('삭제: 허용 (테스트 문서 정리 완료)');
} catch (e) {
  console.error('실패:', e.code ?? e.message);
}

process.exit(0);
