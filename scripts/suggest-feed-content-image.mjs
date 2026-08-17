// 추천 박지 카드에 사용할 TourAPI 사진 후보를 제시하는 읽기 전용 스크립트다.
// 실행: node scripts/suggest-feed-content-image.mjs 안반데기
//       node scripts/suggest-feed-content-image.mjs (발행된 spot_intro 전체)
// 후보를 출력만 하며 Firestore에는 절대 쓰지 않는다.
import 'dotenv/config';

import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
} from 'firebase/firestore';

const TOUR_API_KEY = process.env.TOUR_API_KEY;
const TOUR_API_ENDPOINT =
  'https://apis.data.go.kr/B551011/KorService2';
const IMAGE_SOURCE = '한국관광공사';
const IMAGE_LICENSE = 'kogl-type1';
const IMAGE_ATTRIBUTION = '사진: 한국관광공사 (공공누리 제1유형)';
const MAX_DISTANCE_KM = 5;
const REQUEST_TIMEOUT_MS = 15000;

const firebaseConfig = {
  apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
  authDomain: 'lessismore-7e070.firebaseapp.com',
  projectId: 'lessismore-7e070',
  storageBucket: 'lessismore-7e070.appspot.com',
  messagingSenderId: '434364025032',
  appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
};

const isEmpty = value =>
  value === undefined || value === null || String(value).trim() === '';

if (isEmpty(TOUR_API_KEY)) {
  console.error('❌ TOUR_API_KEY가 없습니다.');
  console.error(
    '   저장소 루트의 .env에 TOUR_API_KEY를 넣고 저장소 루트에서 실행하세요.'
  );
  process.exit(1);
}

const db = getFirestore(initializeApp(firebaseConfig));

console.log('모드: DRY-RUN (후보 출력만, Firestore 쓰기 없음)');

const toItems = json => {
  const rawItems = json?.response?.body?.items?.item;

  if (Array.isArray(rawItems)) {
    return rawItems;
  }

  return rawItems ? [rawItems] : [];
};

const fetchTourApi = async (operation, parameters) => {
  const searchParams = new URLSearchParams({
    serviceKey: TOUR_API_KEY,
    MobileOS: 'ETC',
    MobileApp: 'lessismore',
    _type: 'json',
    ...parameters,
  });
  const response = await fetch(
    `${TOUR_API_ENDPOINT}/${operation}?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(`${operation} HTTP ${response.status}`);
  }

  const json = await response.json();
  const resultCode = json?.response?.header?.resultCode;

  if (resultCode && String(resultCode) !== '0000') {
    const resultMessage = json?.response?.header?.resultMsg || '알 수 없는 오류';
    throw new Error(`${operation} ${resultCode}: ${resultMessage}`);
  }

  return json;
};

const normalizeName = value =>
  String(value || '')
    .toLocaleLowerCase('ko-KR')
    .replace(/[\s·\-_.]/g, '');

const namesMatch = (spotName, candidateTitle) => {
  const normalizedSpotName = normalizeName(spotName);
  const normalizedCandidateTitle = normalizeName(candidateTitle);

  if (isEmpty(normalizedSpotName) || isEmpty(normalizedCandidateTitle)) {
    return false;
  }

  return (
    normalizedSpotName === normalizedCandidateTitle ||
    normalizedSpotName.includes(normalizedCandidateTitle) ||
    normalizedCandidateTitle.includes(normalizedSpotName)
  );
};

const toCoordinate = value => {
  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
};

const toRadians = degrees => (degrees * Math.PI) / 180;

const calculateDistanceKm = (first, second) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(firstLatitude) *
      Math.cos(secondLatitude);

  return (
    2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

const getItemContentId = item => item.contentid || item.contentId;

const getItemCoordinates = item => {
  const latitude = toCoordinate(item.mapy ?? item.mapY);
  const longitude = toCoordinate(item.mapx ?? item.mapX);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
};

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
  const httpsUrl = String(url || '').trim().replace(/^http:/i, 'https:');

  if (isEmpty(httpsUrl)) {
    return { ok: false, url: httpsUrl, status: null, method: null };
  }

  const headStatus = await getRequestStatus(httpsUrl, 'HEAD');

  if (headStatus === 200) {
    return { ok: true, url: httpsUrl, status: headStatus, method: 'HEAD' };
  }

  const getStatus = await getRequestStatus(httpsUrl, 'GET');

  return {
    ok: getStatus === 200,
    url: httpsUrl,
    status: getStatus ?? headStatus,
    method: 'GET',
  };
};

const loadTargets = async () => {
  const requestedNames = process.argv
    .slice(2)
    .filter(argument => !argument.startsWith('--'))
    .map(argument => argument.trim())
    .filter(argument => !isEmpty(argument));

  if (requestedNames.length > 0) {
    const snapshot = await getDocs(collection(db, 'camp-spot'));
    const spots = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data(),
    }));
    const targets = [];

    for (const requestedName of requestedNames) {
      const matches = spots.filter(
        spot => String(spot.name || '').trim() === requestedName
      );

      if (matches.length === 0) {
        targets.push({ name: requestedName, missing: true });
        continue;
      }

      for (const spot of matches) {
        targets.push({
          id: spot.id,
          name: spot.name,
          location: spot.location,
        });
      }
    }

    return targets;
  }

  const feedSnapshot = await getDocs(collection(db, 'feed-content'));
  const contentDocuments = feedSnapshot.docs.filter(document => {
    const content = document.data();

    return content.type === 'spot_intro' && content.published === true;
  });
  const targets = [];

  for (const contentDocument of contentDocuments) {
    const relatedSpotId = contentDocument.data().relatedSpotId;

    if (isEmpty(relatedSpotId)) {
      console.log(
        `⚠️ ${contentDocument.id}: relatedSpotId가 없어 후보 조회를 건너뜁니다.`
      );
      continue;
    }

    const spotDocument = await getDoc(doc(db, 'camp-spot', relatedSpotId));

    if (!spotDocument.exists()) {
      console.log(
        `⚠️ ${contentDocument.id}: camp-spot/${relatedSpotId}가 없어 후보 조회를 건너뜁니다.`
      );
      continue;
    }

    const spot = spotDocument.data();
    targets.push({ id: spotDocument.id, name: spot.name, location: spot.location });
  }

  const uniqueTargets = new Map();

  for (const target of targets) {
    uniqueTargets.set(target.id, target);
  }

  return [...uniqueTargets.values()];
};

const loadImageCandidates = async target => {
  const targetCoordinates = {
    latitude: toCoordinate(target.location?.latitude),
    longitude: toCoordinate(target.location?.longitude),
  };

  if (
    targetCoordinates.latitude === null ||
    targetCoordinates.longitude === null
  ) {
    return { candidates: [], reason: 'camp-spot 좌표가 없습니다.' };
  }

  const searchJson = await fetchTourApi('searchKeyword2', {
    keyword: target.name,
    numOfRows: '100',
    pageNo: '1',
  });
  const matchingItems = toItems(searchJson)
    .map(item => {
      const coordinates = getItemCoordinates(item);

      if (!coordinates || !namesMatch(target.name, item.title)) {
        return null;
      }

      const distanceKm = calculateDistanceKm(targetCoordinates, coordinates);

      if (distanceKm > MAX_DISTANCE_KM) {
        return null;
      }

      return { item, distanceKm };
    })
    .filter(Boolean);
  const uniqueItems = new Map();

  for (const match of matchingItems) {
    const contentId = getItemContentId(match.item);

    if (!isEmpty(contentId)) {
      uniqueItems.set(String(contentId), { ...match, contentId: String(contentId) });
    }
  }

  if (uniqueItems.size === 0) {
    return { candidates: [], reason: '이름·좌표 검증을 통과한 항목이 없습니다.' };
  }

  const candidates = [];

  for (const { item, distanceKm, contentId } of uniqueItems.values()) {
    if (item.cpyrhtDivCd === 'Type1' && !isEmpty(item.firstimage)) {
      candidates.push({
        contentId,
        imageUrl: item.firstimage,
        imageType: item.cpyrhtDivCd,
        distanceKm,
        source: 'firstimage',
      });
    }

    try {
      const galleryJson = await fetchTourApi('detailImage2', {
        contentId,
        imageYN: 'Y',
        numOfRows: '100',
        pageNo: '1',
      });

      for (const image of toItems(galleryJson)) {
        if (image.cpyrhtDivCd !== 'Type1' || isEmpty(image.originimgurl)) {
          continue;
        }

        candidates.push({
          contentId,
          imageUrl: image.originimgurl,
          imageType: image.cpyrhtDivCd,
          distanceKm,
          source: 'gallery',
        });
      }
    } catch (error) {
      console.error(
        `  ⚠️ contentid ${contentId} 갤러리 조회 실패: ${error.message}`
      );
    }
  }

  const verifiedCandidates = [];

  for (const candidate of candidates) {
    const verification = await verifyImageUrl(candidate.imageUrl);

    if (!verification.ok) {
      continue;
    }

    verifiedCandidates.push({
      ...candidate,
      imageUrl: verification.url,
    });
  }

  return {
    candidates: verifiedCandidates,
    reason:
      verifiedCandidates.length === 0
        ? '이미지 단위 Type1과 https 200을 모두 통과한 후보가 없습니다.'
        : null,
  };
};

const printCandidates = (target, candidates) => {
  console.log(`\n## ${target.name} (${target.id || '지정 이름'})`);
  console.log(
    '| contentid | 이미지 URL | 유형 | 거리 | 출처 |\n| --- | --- | --- | --- | --- |'
  );

  for (const candidate of candidates) {
    console.log(
      `| ${candidate.contentId} | ${candidate.imageUrl} | ${candidate.imageType} | ${candidate.distanceKm.toFixed(2)}km | ${candidate.source} |`
    );
    console.log(
      JSON.stringify(
        {
          imageUrl: candidate.imageUrl,
          imageSource: IMAGE_SOURCE,
          imageLicense: IMAGE_LICENSE,
          imageAttribution: IMAGE_ATTRIBUTION,
          imageContentId: candidate.contentId,
        },
        null,
        2
      )
    );
  }
};

const main = async () => {
  const targets = await loadTargets();
  const noCandidateNames = [];

  if (targets.length === 0) {
    console.log('후보를 조회할 박지가 없습니다.');
  }

  for (const target of targets) {
    if (target.missing) {
      console.log(`\n## ${target.name}`);
      console.log('후보 없음: 일치하는 camp-spot 문서가 없습니다.');
      noCandidateNames.push(target.name);
      continue;
    }

    try {
      const result = await loadImageCandidates(target);

      if (result.candidates.length === 0) {
        console.log(`\n## ${target.name} (${target.id})`);
        console.log(`후보 없음: ${result.reason}`);
        noCandidateNames.push(target.name);
        continue;
      }

      printCandidates(target, result.candidates);
    } catch (error) {
      console.log(`\n## ${target.name} (${target.id})`);
      console.log(`후보 없음: TourAPI 조회 실패 (${error.message})`);
      noCandidateNames.push(target.name);
    }
  }

  console.log('\n--- 후보 없는 박지 ---');
  console.log(
    noCandidateNames.length > 0 ? noCandidateNames.join(', ') : '없음'
  );
};

await main();
