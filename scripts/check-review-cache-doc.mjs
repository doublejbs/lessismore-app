// camp-spot-review 캐시 문서 생성 확인용 1회성 점검 스크립트.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
const spotId = process.argv[2] ?? 'curated:gungmangbong';
const snap = await getDoc(doc(db, 'camp-spot-review', spotId));

if (!snap.exists()) {
  console.log('문서 없음:', spotId);
} else {
  const data = snap.data();

  console.log('updatedAt:', data.updatedAt);
  console.log('reviews:', (data.reviews ?? []).length, '건 —', data.reviews?.[0]?.title ?? '');
  console.log('videos:', (data.videos ?? []).length, '건 —', data.videos?.[0]?.title ?? '');
}

process.exit(0);
