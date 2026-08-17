// 사람이 검증해 확정한 추천 박지 카드 사진 3건을 feed-content에 반영하는 스크립트다.
// 실행: node scripts/set-feed-content-image.mjs          (DRY-RUN, 쓰기 안 함)
//       node scripts/set-feed-content-image.mjs --apply   (실제 updateDoc)
// 사진 필드는 세트로만 갱신하며, 새 feed-content 문서는 만들지 않는다.
import 'dotenv/config';

import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  updateDoc,
} from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');
const REQUEST_TIMEOUT_MS = 15000;
const IMAGE_SOURCE = '한국관광공사';
const IMAGE_LICENSE = 'kogl-type1';
const IMAGE_ATTRIBUTION = '사진: 한국관광공사 (공공누리 제1유형)';

const firebaseConfig = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const CONFIRMED_IMAGES = [
  {
    relatedSpotId: '34jJ38PyWz232kpQgeUT',
    spotName: '안반데기',
    imageContentId: '2714439',
    imageUrl:
      'https://tong.visitkorea.or.kr/cms/resource/56/3537656_image2_1.jpg',
  },
  {
    relatedSpotId: '2vEXiVmHKR3L9R6j5UJS',
    spotName: '하화도',
    imageContentId: '2381140',
    imageUrl:
      'https://tong.visitkorea.or.kr/cms/resource/35/3018735_image2_1.jpg',
  },
  {
    relatedSpotId: '006lCz7NWrXR20L9t6qU',
    spotName: '구봉도',
    imageContentId: '2761294',
    imageUrl:
      'https://tong.visitkorea.or.kr/cms/resource/88/3563488_image2_1.jpg',
  },
];

const getRequestStatus = async (url, method) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
    });

    return response.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const verifyImageUrl = async url => {
  const httpsUrl = String(url).trim().replace(/^http:/i, 'https:');
  const headStatus = await getRequestStatus(httpsUrl, 'HEAD');

  if (headStatus === 200) {
    return { ok: true, status: headStatus, method: 'HEAD', url: httpsUrl };
  }

  const getStatus = await getRequestStatus(httpsUrl, 'GET');

  return {
    ok: getStatus === 200,
    status: getStatus ?? headStatus,
    method: 'GET',
    url: httpsUrl,
  };
};

const main = async () => {
  const db = getFirestore(initializeApp(firebaseConfig));
  const feedSnapshot = await getDocs(collection(db, 'feed-content'));
  const mode = APPLY ? 'APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)';

  console.log(`모드: ${mode}`);
  console.log(`대상 확정 사진: ${CONFIRMED_IMAGES.length}건`);

  for (const confirmedImage of CONFIRMED_IMAGES) {
    const matchingDocuments = feedSnapshot.docs.filter(document => {
      const content = document.data();

      return (
        content.type === 'spot_intro' &&
        content.relatedSpotId === confirmedImage.relatedSpotId
      );
    });

    if (matchingDocuments.length === 0) {
      console.log(
        `⚠️ ${confirmedImage.spotName}: 대상 문서가 없습니다 (relatedSpotId=${confirmedImage.relatedSpotId}).`
      );
      continue;
    }

    const verification = await verifyImageUrl(confirmedImage.imageUrl);

    if (!verification.ok) {
      console.log(
        `⚠️ ${confirmedImage.spotName}: 이미지 확인 실패로 건너뜁니다 ` +
          `(HTTP ${verification.status ?? '응답 없음'}, ${verification.method}).`
      );
      continue;
    }

    const fields = {
      imageUrl: verification.url,
      imageSource: IMAGE_SOURCE,
      imageLicense: IMAGE_LICENSE,
      imageAttribution: IMAGE_ATTRIBUTION,
      imageContentId: confirmedImage.imageContentId,
      imageUpdatedAt: new Date().toISOString(),
    };

    for (const document of matchingDocuments) {
      console.log(`\n${confirmedImage.spotName} → feed-content/${document.id}`);
      console.log(
        `이미지 확인: ${verification.method} ${verification.status} ${verification.url}`
      );
      console.log('갱신할 사진 필드 세트:');
      console.log(JSON.stringify(fields, null, 2));

      if (APPLY) {
        await updateDoc(doc(db, 'feed-content', document.id), fields);
        console.log('✅ updateDoc 완료');
      } else {
        console.log('DRY-RUN: updateDoc를 실행하지 않았습니다.');
      }
    }
  }

  if (APPLY) {
    console.log('\n적용 종료: 확정 사진 필드 세트를 updateDoc으로 반영했습니다.');
  } else {
    console.log(
      '\nDRY-RUN 종료: --apply를 붙이지 않았으므로 Firestore를 변경하지 않았습니다.'
    );
  }
};

await main();
