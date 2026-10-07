// 소모품 큐레이션 (Consumables.md CP-7, DataModel.md DM-32·DM-3·DM-12).
//   scripts/consumables.csv 를 읽어 consumable-product/{docId} 를 갱신한다.
//   docId 는 쿠팡이면 productId, 네이버 쇼핑 커넥트면 `naver-<상품번호>`(못 읽으면 linkUrl sha1 앞 12자리).
//   --gear 모드는 카탈로그 gear/{id} 중 coupangUrl 이 있는 문서에 coupangImageUrl 을 채운다(CP-8).
//
//   쓰기 경로: consumable-product 는 "읽기 공개 · 쓰기 admin 전용" 규칙이 목표라 클라이언트 SDK 로는
//   쓸 수 없다. 그래서 firebase CLI 로그인(프로젝트 owner 계정)의 OAuth 토큰으로 Firestore REST API 를
//   호출한다 — IAM 인증 요청은 보안 규칙을 거치지 않는다. 토큰이 만료됐으면 `firebase login --reauth`.
//
//   실행:
//     node scripts/curate-consumables.mjs [csv경로]                 DRY-RUN(쓰기·파트너스 API 호출 없음)
//     node scripts/curate-consumables.mjs [csv경로] --apply         백업 → 이미지 없는 상품만 API 조회 → 쓰기
//     node scripts/curate-consumables.mjs --apply --no-api          파트너스 API 없이 쓰기(CSV imageUrl 열만 씀)
//     node scripts/curate-consumables.mjs --apply --refresh-image <docId>   지정 쿠팡 상품 이미지 강제 재조회
//     node scripts/curate-consumables.mjs --apply --force           건너뛴 행이 있어도 쓰기(그 행의 기존 문서는 내려간다)
//     node scripts/curate-consumables.mjs --gear [--apply] [--no-api] [--refresh-image <gearId>]
//
//   CSV 열: name,pitch,category,merchant,linkUrl,imageUrl,surfaces,order,published (surfaces 는 `;` 구분)
//     merchant: coupang | naver
//     imageUrl: https 쇼핑몰 CDN URL. 값이 있는 행은 그대로 쓰고 파트너스 API 를 부르지 않는다.
//               호스트는 쇼핑몰별로 검사한다 — 쿠팡 *.coupangcdn.com, 네이버 shop-phinf/shopping-phinf.pstatic.net.
//               네이버 행은 필수다 — 네이버 행은 쿠팡 API 를 절대 부르지 않는다.
//   기본 CSV 경로: scripts/consumables.csv (gitignore — 예시는 scripts/consumables.example.csv)
//
//   쿠팡 파트너스 키는 사용자의 다른 서비스와 공유한다(분당 100회, 경고 3회 누적 시 이용 제한).
//   - DRY-RUN 은 파트너스 API 를 절대 부르지 않는다(호출 예정 건수만 출력).
//   - 이미지가 없는 문서만, 한 번에 하나씩, 2초 간격으로 부른다.
//   - rCode 비정상·HTTP 403/429·한도 메시지면 즉시 호출을 멈추고(재시도 없음) 처리/남은 건수를 보고,
//     이미 계획된 쓰기는 이미지 없이 마저 기록한 뒤 exit 2 — 다시 돌리면 남은 것부터 이어진다.
//   - 키는 출력·로그·백업에 남기지 않는다.
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const PROJECT_ID = 'lessismore-7e070';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COLLECTION = 'consumable-product';

// firebase-tools 의 공개 OAuth 클라이언트 상수다 — firebase-tools 오픈소스에 그대로 들어 있는
// "설치형 앱" 클라이언트라 비밀이 아니다. 이 값만으로는 아무 권한도 없고, 실제 권한은 사용자의
// `firebase login` refresh token 에서 온다(그 토큰은 출력·로그·백업에 남기지 않는다).
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const FIREBASE_TOOLS_CONFIG = `${homedir()}/.config/configstore/firebase-tools.json`;

const COUPANG_KEY_FILE = `${homedir()}/Library/Mobile Documents/com~apple~CloudDocs/claude/coupang-partners.env`;
const COUPANG_HOST = 'https://api-gateway.coupang.com';
const COUPANG_SEARCH_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/search';
const COUPANG_CALL_INTERVAL_MS = 2000;
const COUPANG_SEARCH_LIMIT = 10;

const SHORT_LINK_FETCH_INTERVAL_MS = 300;
const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const PRODUCT_ID_PATTERN = /productId(?:=|%3D|%253D)(\d+)/;
// 네이버 상품 URL(스마트스토어·브랜드스토어 /products/<번호>, 쇼핑 nvMid·productNo 파라미터)의 숫자 상품번호.
// 쇼핑 커넥트 링크가 리다이렉트로 넘기는 channelProductNo 가 스토어 상품번호라 가장 먼저 본다.
const NAVER_PRODUCT_NO_PATTERNS = [
  /[?&]channelProductNo=(\d+)/,
  /\/products\/(\d+)/,
  /[?&](?:nvMid|productNo|nv_mid)=(\d+)/,
];
const NAVER_DOC_PREFIX = 'naver-';
const NAVER_HASH_LENGTH = 12;
// 쇼핑몰별로 허용하는 상품 이미지 CDN 호스트(CP-2). 다른 호스트는 행을 건너뛴다.
const IMAGE_HOST_RULES = {
  coupang: hostname => hostname.endsWith('.coupangcdn.com'),
  naver: hostname => ['shop-phinf.pstatic.net', 'shopping-phinf.pstatic.net'].includes(hostname),
};

// model/consumable/ConsumableCategory.ts · ConsumableSurface.ts 와 같은 값(DM-32).
const CATEGORY_VALUES = ['fuel', 'hygiene', 'toiletry', 'etc'];
const SURFACE_VALUES = ['home', 'bagDetail', 'community'];
// model/consumable/ConsumableMerchant.ts 와 같은 값(DM-32).
const MERCHANT_COUPANG = 'coupang';
const MERCHANT_NAVER = 'naver';
const MERCHANT_VALUES = [MERCHANT_COUPANG, MERCHANT_NAVER];
const CSV_COLUMNS = ['name', 'pitch', 'category', 'merchant', 'linkUrl', 'imageUrl', 'surfaces', 'order', 'published'];
// 가격 주장 금지(CP-1) — pitch 에 이 패턴이 있으면 행을 쓰지 않는다.
const PRICE_CLAIM_PATTERN = /최저가|\d[\d,]*\s*원/;
// diff 비교 대상(updatedAt 제외).
const CONSUMABLE_FIELDS = ['name', 'pitch', 'category', 'merchant', 'linkUrl', 'productId', 'surfaces', 'order', 'published'];

const EXIT_QUOTA_ABORT = 2;

// --- 인자 ------------------------------------------------------------------

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const NO_API = argv.includes('--no-api');
const GEAR_MODE = argv.includes('--gear');
const FORCE = argv.includes('--force');

const refreshImageIds = new Set();

argv.forEach((arg, index) => {
  if (arg === '--refresh-image' && argv[index + 1]) {
    refreshImageIds.add(argv[index + 1]);
  }
});

const csvPath = argv.find(a => a.endsWith('.csv')) ?? 'scripts/consumables.csv';

// --- 공용 유틸 -------------------------------------------------------------

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const isEmpty = v => v === undefined || v === null || String(v).trim() === '';

const timestampForFile = () => new Date().toISOString().replace(/[:.]/g, '-');

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

class QuotaAbortError extends Error {}

// 따옴표 필드를 처리하는 한 줄 CSV 파서(set-coupang-url.mjs 와 같은 규칙).
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

// --- OAuth 토큰 (firebase CLI 로그인) ----------------------------------------

const getAccessToken = async () => {
  if (!existsSync(FIREBASE_TOOLS_CONFIG)) {
    throw new Error(`firebase CLI 로그인 정보가 없습니다(${FIREBASE_TOOLS_CONFIG}). \`firebase login\` 후 다시 실행하세요.`);
  }

  const refreshToken = JSON.parse(readFileSync(FIREBASE_TOOLS_CONFIG, 'utf8'))?.tokens?.refresh_token;

  if (isEmpty(refreshToken)) {
    throw new Error('firebase-tools.json 에 refresh_token 이 없습니다. `firebase login --reauth` 후 다시 실행하세요.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: FIREBASE_CLI_CLIENT_ID,
      client_secret: FIREBASE_CLI_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth 토큰 교환 실패(HTTP ${res.status}). \`firebase login --reauth\` 후 다시 실행하세요.`);
  }

  const { access_token: accessToken } = await res.json();

  return accessToken;
};

// --- Firestore REST --------------------------------------------------------

const encodeValue = value => {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }

  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value) } };
  }

  return { stringValue: String(value) };
};

const encodeFields = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, encodeValue(v)]));

const decodeValue = value => {
  if ('stringValue' in value) {
    return value.stringValue;
  }

  if ('integerValue' in value) {
    return Number(value.integerValue);
  }

  if ('doubleValue' in value) {
    return value.doubleValue;
  }

  if ('booleanValue' in value) {
    return value.booleanValue;
  }

  if ('timestampValue' in value) {
    return value.timestampValue;
  }

  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeValue);
  }

  if ('mapValue' in value) {
    return decodeFields(value.mapValue.fields ?? {});
  }

  return null;
};

const decodeFields = fields => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));

const decodeDocument = document => ({
  id: document.name.split('/').pop(),
  data: decodeFields(document.fields ?? {}),
});

const firestoreRequest = async (token, url, init = {}) => {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.text();

    throw new Error(`Firestore ${init.method ?? 'GET'} 실패(HTTP ${res.status}): ${body.slice(0, 300)}`);
  }

  return res.json();
};

const listCollection = async (token, collectionId) => {
  const docs = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({ pageSize: '300' });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const body = await firestoreRequest(token, `${FIRESTORE_BASE}/${collectionId}?${params}`);

    (body.documents ?? []).forEach(d => docs.push(decodeDocument(d)));
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);

  return docs;
};

// coupangUrl 이 비어 있지 않은 gear 문서만(카탈로그 4만여 건을 전부 받지 않는다).
const queryGearsWithCoupangUrl = async token => {
  const body = await firestoreRequest(token, `${FIRESTORE_BASE}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'gear' }],
        where: {
          fieldFilter: { field: { fieldPath: 'coupangUrl' }, op: 'GREATER_THAN', value: { stringValue: '' } },
        },
        select: {
          fields: ['name', 'nameKorean', 'company', 'companyKorean', 'coupangUrl', 'coupangImageUrl'].map(fieldPath => ({
            fieldPath,
          })),
        },
      },
    }),
  });

  return body.filter(row => row.document).map(row => decodeDocument(row.document));
};

// updateMask 로 지정한 필드만 덮어쓴다(문서가 없으면 생성).
const patchDocument = async (token, path, data) => {
  const params = new URLSearchParams();

  Object.keys(data).forEach(field => params.append('updateMask.fieldPaths', field));

  await firestoreRequest(token, `${FIRESTORE_BASE}/${path}?${params}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
};

// --- productId (단축 링크 HTML, 파트너스 API 안 씀) ---------------------------

const resolveProductId = async shortUrl => {
  const res = await fetch(shortUrl, { headers: { 'User-Agent': IPHONE_SAFARI_UA }, redirect: 'follow' });
  const html = (await res.text()).replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const match = html.match(PRODUCT_ID_PATTERN) ?? res.url.match(PRODUCT_ID_PATTERN);

  return match?.[1] ?? null;
};

// --- 네이버 상품번호 (링크·리다이렉트 결과, API 안 씀) ---------------------------

const matchNaverProductNo = url => {
  for (const pattern of NAVER_PRODUCT_NO_PATTERNS) {
    const match = url.match(pattern);

    if (match) {
      return match[1];
    }
  }

  return null;
};

// linkUrl 에서 바로 못 읽으면 리다이렉트를 따라가 최종 URL 에서 읽는다. 끝내 못 읽으면 linkUrl sha1 앞 12자리.
// 실패해도 행을 버리지 않는다 — 같은 linkUrl 이면 같은 id 라 재실행해도 문서가 늘지 않는다.
const resolveNaverDocKey = async linkUrl => {
  const direct = matchNaverProductNo(linkUrl);

  if (direct) {
    return { productId: direct, fetched: false };
  }

  try {
    const res = await fetch(linkUrl, { headers: { 'User-Agent': IPHONE_SAFARI_UA }, redirect: 'follow' });
    const redirected = matchNaverProductNo(res.url);

    if (redirected) {
      return { productId: redirected, fetched: true };
    }
  } catch {
    // 아래 해시로 떨어진다.
  }

  // 해시는 문서 id 용일 뿐 상품번호가 아니므로 productId 는 비워 둔다(호출하는 쪽이 보고한다).
  return {
    productId: '',
    docKey: createHash('sha1').update(linkUrl).digest('hex').slice(0, NAVER_HASH_LENGTH),
    fetched: true,
  };
};

// --- 쿠팡 파트너스 products/search ------------------------------------------

const loadCoupangKeys = () => {
  if (!existsSync(COUPANG_KEY_FILE)) {
    throw new Error('쿠팡 파트너스 키 파일(iCloud claude/coupang-partners.env)이 없습니다. --no-api 로 실행하세요.');
  }

  const env = Object.fromEntries(
    readFileSync(COUPANG_KEY_FILE, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const at = line.indexOf('=');

        return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')];
      })
  );

  if (isEmpty(env.COUPANG_ACCESS_KEY) || isEmpty(env.COUPANG_SECRET_KEY)) {
    throw new Error('키 파일에 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 가 없습니다.');
  }

  return { accessKey: env.COUPANG_ACCESS_KEY, secretKey: env.COUPANG_SECRET_KEY };
};

// yyMMdd'T'HHmmss'Z' (GMT)
const coupangSignedDate = () => {
  const iso = new Date().toISOString();

  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
};

const isQuotaMessage = message => /초과|limit|quota|exceed/i.test(message ?? '');

// 이름으로 한 번 검색해 productId 가 일치하는 항목의 productImage 를 돌려준다. 없으면 null.
const searchProductImage = async (keys, keyword, productId) => {
  const query = `keyword=${encodeURIComponent(keyword)}&limit=${COUPANG_SEARCH_LIMIT}`;
  const signedDate = coupangSignedDate();
  const signature = createHmac('sha256', keys.secretKey)
    .update(`${signedDate}GET${COUPANG_SEARCH_PATH}${query}`)
    .digest('hex');
  const authorization = `CEA algorithm=HmacSHA256, access-key=${keys.accessKey}, signed-date=${signedDate}, signature=${signature}`;

  const res = await fetch(`${COUPANG_HOST}${COUPANG_SEARCH_PATH}?${query}`, {
    headers: { Authorization: authorization, 'Content-Type': 'application/json;charset=UTF-8' },
  });
  const text = await res.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  const rCode = body?.rCode;
  const rMessage = body?.rMessage ?? body?.message ?? '';

  if (res.status === 403 || res.status === 429 || isQuotaMessage(rMessage) || isQuotaMessage(text.slice(0, 500))) {
    throw new QuotaAbortError(`HTTP ${res.status} rCode=${rCode ?? '-'} ${rMessage}`.trim());
  }

  if (!res.ok || String(rCode) !== '0') {
    throw new QuotaAbortError(`비정상 응답 HTTP ${res.status} rCode=${rCode ?? '-'} ${rMessage}`.trim());
  }

  const products = body?.data?.productData ?? body?.data ?? [];
  const hit = (Array.isArray(products) ? products : []).find(p => String(p.productId) === String(productId));

  return hit?.productImage ?? null;
};

// 대상 목록을 순서대로(병렬 금지) 조회한다. 한도·이상 응답이면 즉시 멈춘다.
//   items: [{ key, keyword, productId }]  →  { images: Map<key, url|null>, aborted, abortReason, remaining }
const fetchImagesSerially = async items => {
  const images = new Map();

  if (items.length === 0) {
    return { images, aborted: false, abortReason: '', remaining: [] };
  }

  const keys = loadCoupangKeys();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (index > 0) {
      await sleep(COUPANG_CALL_INTERVAL_MS);
    }

    try {
      const url = await searchProductImage(keys, item.keyword, item.productId);

      images.set(item.key, url);
      console.log(`  [${index + 1}/${items.length}] ${item.key} ${item.keyword} → ${url ? '이미지 확보' : '일치 항목 없음'}`);
    } catch (error) {
      if (error instanceof QuotaAbortError) {
        return { images, aborted: true, abortReason: error.message, remaining: items.slice(index) };
      }

      throw error;
    }
  }

  return { images, aborted: false, abortReason: '', remaining: [] };
};

const reportAbort = (result, total) => {
  console.log(`\n⚠ 쿠팡 파트너스 API 중단: ${result.abortReason}`);
  console.log(`  처리 ${total - result.remaining.length}건 / 남은 ${result.remaining.length}건 — 재시도하지 않습니다.`);
  result.remaining.forEach(item => console.log(`    남음: ${item.key} ${item.keyword}`));
  console.log('  한도가 풀린 뒤 같은 명령을 다시 실행하면 이미지 없는 문서부터 이어집니다.');
};

// --- 소모품 모드 -------------------------------------------------------------

const readCsvRows = () => {
  if (!existsSync(csvPath)) {
    throw new Error(`CSV 가 없습니다: ${csvPath} (scripts/consumables.example.csv 를 복사해 만드세요)`);
  }

  const lines = readFileSync(csvPath, 'utf8')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter(line => line.trim() !== '');
  const header = parseLine(lines[0]).map(h => h.trim());
  const missingColumns = CSV_COLUMNS.filter(c => !header.includes(c));

  if (missingColumns.length > 0) {
    throw new Error(`CSV 헤더에 열이 없습니다: ${missingColumns.join(', ')}`);
  }

  return lines.slice(1).map((line, index) => {
    const cells = parseLine(line);
    const row = Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));

    return { lineNo: index + 2, ...row };
  });
};

// 행 검증 → { value, error }
const validateRow = row => {
  if (isEmpty(row.name) || isEmpty(row.pitch) || isEmpty(row.linkUrl)) {
    return { error: 'name / pitch / linkUrl 은 필수' };
  }

  if (!MERCHANT_VALUES.includes(row.merchant)) {
    return { error: `merchant 는 ${MERCHANT_VALUES.join('|')} 중 하나 (받은 값: ${row.merchant || '빈 값'})` };
  }

  if (!row.linkUrl.startsWith('https://')) {
    return { error: `linkUrl 은 https:// 로 시작해야 한다 (받은 값: ${row.linkUrl})` };
  }

  if (!CATEGORY_VALUES.includes(row.category)) {
    return { error: `category 는 ${CATEGORY_VALUES.join('|')} 중 하나 (받은 값: ${row.category || '빈 값'})` };
  }

  const surfaces = row.surfaces
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  const badSurface = surfaces.find(s => !SURFACE_VALUES.includes(s));

  if (badSurface) {
    return { error: `surfaces 는 ${SURFACE_VALUES.join(';')} 의 조합 (잘못된 값: ${badSurface})` };
  }

  const order = Number(row.order);

  if (isEmpty(row.order) || !Number.isFinite(order)) {
    return { error: `order 는 숫자 (받은 값: ${row.order || '빈 값'})` };
  }

  const publishedRaw = row.published.toLowerCase();

  if (!['true', 'false', ''].includes(publishedRaw)) {
    return { error: `published 는 true|false (받은 값: ${row.published})` };
  }

  if (PRICE_CLAIM_PATTERN.test(row.pitch) || PRICE_CLAIM_PATTERN.test(row.name)) {
    return { error: '이름·소개에 가격 주장(최저가·금액)을 넣지 않는다(CP-1)' };
  }

  const csvImageUrl = row.imageUrl ?? '';

  // ATS 가 막는 http 이미지는 앱이 버리므로(ConsumableStore) 여기서부터 받지 않는다.
  if (!isEmpty(csvImageUrl) && !csvImageUrl.startsWith('https://')) {
    return { error: `imageUrl 은 https:// 로 시작해야 한다 (받은 값: ${csvImageUrl})` };
  }

  if (!isEmpty(csvImageUrl)) {
    let hostname = '';

    try {
      hostname = new URL(csvImageUrl).hostname;
    } catch {
      return { error: `imageUrl 을 URL 로 읽지 못함 (받은 값: ${csvImageUrl})` };
    }

    const isAllowedHost = IMAGE_HOST_RULES[row.merchant];

    if (!isAllowedHost || !isAllowedHost(hostname)) {
      return { error: `imageUrl 호스트 ${hostname} 는 ${row.merchant} 상품 이미지 CDN 이 아니다` };
    }
  }

  // 네이버 상품은 이미지 API 경로가 없다 — CSV 가 유일한 이미지 출처다.
  if (row.merchant === MERCHANT_NAVER && isEmpty(csvImageUrl)) {
    return { error: 'merchant naver 행은 imageUrl 이 필수 (쿠팡 API 를 부르지 않는다)' };
  }

  return {
    value: {
      name: row.name,
      pitch: row.pitch,
      category: row.category,
      merchant: row.merchant,
      linkUrl: row.linkUrl,
      surfaces: [...new Set(surfaces)],
      order,
      published: publishedRaw !== 'false',
      ...(isEmpty(csvImageUrl) ? {} : { imageUrl: csvImageUrl }),
    },
  };
};

const runConsumables = async token => {
  console.log(`CSV: ${csvPath}`);

  const rows = readCsvRows();
  const existingDocs = await listCollection(token, COLLECTION);
  const existingById = new Map(existingDocs.map(d => [d.id, d.data]));
  const existingIdByUrl = new Map(existingDocs.map(d => [d.data.linkUrl, d.id]));

  console.log(`CSV 행: ${rows.length}개 / 기존 ${COLLECTION} 문서: ${existingDocs.length}개`);

  const skipped = [];
  const hashFallbacks = [];
  const targets = new Map();
  let fetchedLinkCount = 0;

  for (const row of rows) {
    const { value, error } = validateRow(row);

    if (error) {
      skipped.push(`${row.lineNo}행 ${row.name || '(이름 없음)'}: ${error}`);
      continue;
    }

    // 같은 링크를 이미 쓴 문서가 있으면 다시 받지 않는다(문서 id = docId, productId 필드는 숫자 부분).
    const existingDocId = existingIdByUrl.get(value.linkUrl) ?? null;
    let docId = existingDocId;
    let productId = existingDocId ? (existingById.get(existingDocId)?.productId ?? null) : null;
    // 해시로 떨어진 네이버 문서는 productId 가 빈 값이다 — 다시 조회해도 같은 결과라 그대로 쓴다.
    const isKnownNaverHashDoc =
      value.merchant === MERCHANT_NAVER && Boolean(docId?.startsWith(NAVER_DOC_PREFIX)) && productId === '';

    if (isKnownNaverHashDoc) {
      hashFallbacks.push(`${row.lineNo}행 ${value.name}: ${docId} (기존 해시 문서)`);
    }

    if (!isKnownNaverHashDoc && (!docId || !productId)) {
      if (fetchedLinkCount > 0) {
        await sleep(SHORT_LINK_FETCH_INTERVAL_MS);
      }

      fetchedLinkCount += 1;

      if (value.merchant === MERCHANT_NAVER) {
        const naverKey = await resolveNaverDocKey(value.linkUrl);

        productId = naverKey.productId;
        docId = `${NAVER_DOC_PREFIX}${naverKey.docKey ?? naverKey.productId}`;

        if (naverKey.docKey) {
          hashFallbacks.push(`${row.lineNo}행 ${value.name}: ${docId} (상품번호를 못 읽어 linkUrl 해시, productId 빈 값)`);
        }
      } else {
        try {
          productId = await resolveProductId(value.linkUrl);
        } catch (e) {
          skipped.push(`${row.lineNo}행 ${value.name}: 단축 링크 조회 실패 (${e.message})`);
          continue;
        }

        docId = productId;
      }
    }

    if (!productId && value.merchant !== MERCHANT_NAVER) {
      skipped.push(`${row.lineNo}행 ${value.name}: 단축 링크에서 productId 를 찾지 못함 (${value.linkUrl})`);
      continue;
    }

    if (targets.has(docId)) {
      skipped.push(`${row.lineNo}행 ${value.name}: 문서 id ${docId} 가 ${targets.get(docId).lineNo}행과 중복`);
      continue;
    }

    targets.set(docId, { ...value, productId, lineNo: row.lineNo });
  }

  // 계획 수립
  const plan = [];

  for (const [docId, target] of targets) {
    const { lineNo: _lineNo, ...next } = target;
    const prev = existingById.get(docId);
    const changedFields = CONSUMABLE_FIELDS.filter(f => !prev || !sameValue(prev[f], next[f]));
    // CSV 가 imageUrl 을 직접 주면 그 값을 쓰고 API 를 부르지 않는다(--refresh-image 도 무시).
    // 쿠팡 API 는 쿠팡 상품만 부른다 — 네이버 행은 검증에서 imageUrl 이 필수라 여기 오지 않지만 한 번 더 막는다.
    const hasCsvImage = !isEmpty(next.imageUrl);

    if (hasCsvImage && (!prev || !sameValue(prev.imageUrl, next.imageUrl))) {
      changedFields.push('imageUrl');
    }

    const needsImage =
      next.merchant === MERCHANT_COUPANG &&
      !hasCsvImage &&
      (isEmpty(prev?.imageUrl) || refreshImageIds.has(docId));

    if (!prev) {
      plan.push({ kind: 'create', docId, next, changedFields, needsImage });
    } else if (changedFields.length > 0 || needsImage) {
      plan.push({ kind: 'update', docId, next, changedFields, needsImage });
    }
  }

  const unpublish = existingDocs
    .filter(d => !targets.has(d.id) && d.data.published !== false)
    .map(d => ({ kind: 'unpublish', docId: d.id, name: d.data.name }));

  const unchangedCount = targets.size - plan.length;
  const imageTargets = plan.filter(p => p.needsImage);

  // 출력
  if (skipped.length > 0) {
    console.log(`\n⚠ 건너뛴 행 ${skipped.length}개:`);
    skipped.forEach(s => console.log(`  ${s}`));
  }

  if (hashFallbacks.length > 0) {
    console.log(`\n⚠ 네이버 상품번호를 못 읽은 행 ${hashFallbacks.length}개(문서 id = naver-<linkUrl 해시>):`);
    hashFallbacks.forEach(s => console.log(`  ${s}`));
  }

  console.log('\n계획:');
  plan.forEach(p => {
    const tag = p.kind === 'create' ? '+ 생성' : '~ 갱신';
    const detail = p.kind === 'update' && p.changedFields.length > 0 ? ` [${p.changedFields.join(', ')}]` : '';
    const image = p.needsImage ? ' (이미지 조회 대상)' : !isEmpty(p.next.imageUrl) ? ' (CSV imageUrl)' : '';

    console.log(
      `  ${tag} ${p.docId} ${p.next.name} — ${p.next.merchant} · ${p.next.category} · ${p.next.surfaces.join(';') || '(자리 없음)'} · order ${p.next.order} · published ${p.next.published}${detail}${image}`
    );
  });
  unpublish.forEach(u => console.log(`  - 내림 ${u.docId} ${u.name} (CSV 에 없음 → published:false, 삭제하지 않음)`));
  console.log(
    `\n요약: 생성 ${plan.filter(p => p.kind === 'create').length} / 갱신 ${plan.filter(p => p.kind === 'update').length} / 내림 ${unpublish.length} / 변경 없음 ${unchangedCount} / 건너뜀 ${skipped.length}`
  );
  console.log(`파트너스 API 호출 예정: ${NO_API ? 0 : imageTargets.length}건${NO_API ? ' (--no-api)' : ''}`);

  if (!APPLY) {
    console.log('\nDRY-RUN 완료 — Firestore 쓰기·파트너스 API 호출 없음. 실제 쓰려면 --apply 를 붙이세요.');

    return 0;
  }

  // 건너뛴 행의 기존 문서는 targets 에 없어 '내림'으로 잡힌다 — 검증 실수로 조용히 내려가지 않게 멈춘다.
  if (skipped.length > 0 && !FORCE) {
    console.log(
      `\n중단 — 건너뛴 행 ${skipped.length}개가 있어 쓰지 않았습니다. 그 행에 해당하는 기존 문서가 '내림'으로 처리될 수 있습니다.`
    );
    console.log('CSV 를 고친 뒤 다시 실행하거나, 의도한 것이면 --force 를 붙이세요.');

    return 1;
  }

  if (plan.length === 0 && unpublish.length === 0) {
    console.log('\n쓸 내용이 없습니다.');

    return 0;
  }

  const backupPath = `scripts/backup-consumable-product-${timestampForFile()}.json`;

  writeFileSync(backupPath, JSON.stringify(existingDocs, null, 2));
  console.log(`\n백업 저장: ${backupPath} (${existingDocs.length}개 문서)`);

  let imageResult = { images: new Map(), aborted: false, abortReason: '', remaining: [] };

  if (!NO_API && imageTargets.length > 0) {
    console.log(`\n쿠팡 파트너스 이미지 조회 (${imageTargets.length}건, ${COUPANG_CALL_INTERVAL_MS}ms 간격):`);
    imageResult = await fetchImagesSerially(
      imageTargets.map(p => ({ key: p.docId, keyword: p.next.name, productId: p.next.productId }))
    );
  }

  const now = new Date();

  for (const p of plan) {
    const data = { ...p.next, updatedAt: now };

    // CSV imageUrl 은 next 에 이미 들어 있다. API 는 CSV imageUrl 이 없는 행만 조회했으므로 덮어쓸 일이 없다.
    // 조회에 성공한 경우에만 imageUrl 을 쓴다 — 조회하지 않았거나 일치 항목이 없으면 기존 값을 건드리지 않는다.
    if (imageResult.images.get(p.docId)) {
      data.imageUrl = imageResult.images.get(p.docId);
    }

    await patchDocument(token, `${COLLECTION}/${p.docId}`, data);
    console.log(`  ★ ${p.kind === 'create' ? '생성' : '갱신'} ${p.docId} ${p.next.name}${data.imageUrl ? ' + imageUrl' : ''}`);
  }

  for (const u of unpublish) {
    await patchDocument(token, `${COLLECTION}/${u.docId}`, { published: false, updatedAt: now });
    console.log(`  ★ 내림 ${u.docId} ${u.name}`);
  }

  const noMatch = imageTargets.filter(p => imageResult.images.has(p.docId) && !imageResult.images.get(p.docId));

  if (noMatch.length > 0) {
    console.log(`\n이미지 일치 항목 없음 ${noMatch.length}건(imageUrl 비워 둠 — 카드는 아이콘 폴백):`);
    noMatch.forEach(p => console.log(`  ${p.docId} ${p.next.name}`));
  }

  console.log(`\n★ 완료: 쓰기 ${plan.length + unpublish.length}건`);

  if (imageResult.aborted) {
    reportAbort(imageResult, imageTargets.length);

    return EXIT_QUOTA_ABORT;
  }

  return 0;
};

// --- 장비 쿠팡 썸네일 모드 (--gear, CP-8) ------------------------------------

// 여러 gear 문서가 같은 쿠팡 상품을 가리킬 수 있다(예: 같은 장비의 변형 문서) — 상품당 한 번만 조회한다.
const uniqueLookups = targets => {
  const byProductId = new Map();

  targets.forEach(t => {
    if (!byProductId.has(t.productId)) {
      byProductId.set(t.productId, { key: t.productId, keyword: t.keyword, productId: t.productId });
    }
  });

  return [...byProductId.values()];
};

const runGear = async token => {
  const gears = await queryGearsWithCoupangUrl(token);
  const candidates = gears.filter(g => isEmpty(g.data.coupangImageUrl) || refreshImageIds.has(g.id));

  console.log(`coupangUrl 있는 gear: ${gears.length}건 / coupangImageUrl 채울 대상: ${candidates.length}건`);

  const skipped = [];
  const targets = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const gear = candidates[index];
    const displayName = gear.data.nameKorean || gear.data.name || '';
    const company = gear.data.companyKorean || gear.data.company || '';

    if (index > 0) {
      await sleep(SHORT_LINK_FETCH_INTERVAL_MS);
    }

    let productId = null;

    try {
      productId = await resolveProductId(gear.data.coupangUrl);
    } catch (e) {
      skipped.push(`${gear.id} ${displayName}: 단축 링크 조회 실패 (${e.message})`);
      continue;
    }

    if (!productId) {
      skipped.push(`${gear.id} ${displayName}: productId 를 찾지 못함 (${gear.data.coupangUrl})`);
      continue;
    }

    targets.push({
      key: gear.id,
      keyword: `${company} ${displayName}`.trim(),
      productId,
      prevCoupangImageUrl: gear.data.coupangImageUrl ?? null,
      coupangUrl: gear.data.coupangUrl,
    });
  }

  if (skipped.length > 0) {
    console.log(`\n⚠ 건너뜀 ${skipped.length}건:`);
    skipped.forEach(s => console.log(`  ${s}`));
  }

  console.log('\n계획:');
  targets.forEach(t => console.log(`  ~ gear/${t.key} "${t.keyword}" productId ${t.productId}`));
  console.log(
    `파트너스 API 호출 예정: ${NO_API ? 0 : uniqueLookups(targets).length}건(같은 productId 는 한 번)${NO_API ? ' (--no-api)' : ''}`
  );

  if (!APPLY) {
    console.log('\nDRY-RUN 완료 — Firestore 쓰기·파트너스 API 호출 없음. 실제 쓰려면 --apply 를 붙이세요.');

    return 0;
  }

  if (NO_API || targets.length === 0) {
    console.log('\n--no-api 이거나 대상이 없어 쓸 내용이 없습니다(coupangImageUrl 은 API 결과로만 채운다).');

    return 0;
  }

  const backupPath = `scripts/backup-gear-coupangimage-${timestampForFile()}.json`;

  writeFileSync(
    backupPath,
    JSON.stringify(
      targets.map(t => ({ id: t.key, coupangUrl: t.coupangUrl, productId: t.productId, prevCoupangImageUrl: t.prevCoupangImageUrl })),
      null,
      2
    )
  );
  console.log(`\n백업 저장: ${backupPath} (${targets.length}건)`);

  const lookups = uniqueLookups(targets);

  console.log(`\n쿠팡 파트너스 이미지 조회 (${lookups.length}건, ${COUPANG_CALL_INTERVAL_MS}ms 간격):`);

  const result = await fetchImagesSerially(lookups);
  let written = 0;

  for (const t of targets) {
    const url = result.images.get(t.productId);

    if (url) {
      await patchDocument(token, `gear/${t.key}`, { coupangImageUrl: url });
      written += 1;
    }
  }

  const noMatch = targets.filter(t => result.images.has(t.productId) && !result.images.get(t.productId));

  if (noMatch.length > 0) {
    console.log(`\n이미지 일치 항목 없음 ${noMatch.length}건(비워 둠 — 장비 상세는 텍스트 행 유지):`);
    noMatch.forEach(t => console.log(`  gear/${t.key} ${t.keyword}`));
  }

  console.log(`\n★ 완료: coupangImageUrl ${written}건 기록`);

  if (result.aborted) {
    reportAbort(result, lookups.length);

    return EXIT_QUOTA_ABORT;
  }

  return 0;
};

// --- 실행 ------------------------------------------------------------------

console.log(`모드: ${GEAR_MODE ? '장비 쿠팡 썸네일(--gear)' : '소모품 큐레이션'} / ${APPLY ? '★ APPLY (실제 쓰기)' : 'DRY-RUN (쓰기 안 함)'}${NO_API ? ' / --no-api' : ''}`);

if (refreshImageIds.size > 0) {
  console.log(`이미지 강제 재조회: ${[...refreshImageIds].join(', ')}`);
}

try {
  const token = await getAccessToken();
  const exitCode = GEAR_MODE ? await runGear(token) : await runConsumables(token);

  process.exit(exitCode);
} catch (error) {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
}
