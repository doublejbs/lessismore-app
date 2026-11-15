import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { loadStaticMapImageManager } from './MapLibreModule';
import { MAP_STYLE_URL, MAP_STYLE_VERSION } from './MapStyle';

export interface StaticMapImageRequest {
  latitude: number;
  longitude: number;
  zoom: number;
  // 표시 박스 크기(pt). 기기 배율은 SDK가 반영한다(아래 `createImage` 주석).
  width: number;
  height: number;
}

export interface StaticMapImageOptions {
  /**
   * 연결이 없는지(`NetworkStatus.isOffline()`). 오프라인이면 **캐시만** 본다 — 타일 없이 렌더하면 빈 지면 PNG가
   * 만들어져 캐시에 남고, 온라인으로 돌아와도 그 빈 그림을 계속 보여 준다.
   */
  isOffline: boolean;
}

// 앱 캐시 디렉터리 아래 썸네일 폴더(MAP-3). OS가 비울 수 있다 — 없으면 다시 만든다.
const CACHE_DIRECTORY = 'map-thumbs';
// 생성 동시 실행 수(MAP-3) — 목록 스크롤에서 수십 장이 한꺼번에 들어온다.
const MAX_CONCURRENT = 2;
// 캐시 키의 좌표 자릿수(소수 5자리 ≈ 1m).
const COORDINATE_DIGITS = 5;
// 생성 상한(ms). 타일 서버가 응답하지 않으면 SDK가 끝나지 않을 수 있어 큐 자리를 영영 잡지 않게 끊는다.
const CREATE_TIMEOUT_MS = 15000;

interface QueuedJob {
  run: () => Promise<void>;
}

const queue: QueuedJob[] = [];
let running = 0;
// 같은 키를 동시에 여러 번 부르면(같은 배낭이 두 목록에) 생성 한 번을 나눠 쓴다.
const inFlight = new Map<string, Promise<string | null>>();
// 이 세션에서 생성에 실패한 키 — 다시 시도하지 않는다(목록 스크롤마다 같은 실패를 되풀이하지 않게).
// 오프라인에서 온라인으로 돌아오면 비운다(그때 실패는 연결 탓이었을 수 있다).
const failedKeys = new Set<string>();
let wasOffline = false;

const getCacheDirectory = (): Directory =>
  new Directory(Paths.cache, CACHE_DIRECTORY);

const getCacheFileName = ({
  latitude,
  longitude,
  zoom,
  width,
  height,
}: StaticMapImageRequest): string =>
  `${MAP_STYLE_VERSION}-${latitude.toFixed(COORDINATE_DIGITS)}-${longitude.toFixed(COORDINATE_DIGITS)}-${zoom}-${width}x${height}.png`;

const pumpQueue = () => {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift();

    if (!job) {
      return;
    }

    running += 1;
    void job.run().finally(() => {
      running -= 1;
      pumpQueue();
    });
  }
};

const enqueue = <T>(task: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    queue.push({
      run: async () => {
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        }
      },
    });
    pumpQueue();
  });

const withTimeout = <T>(task: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout ${timeoutMs}ms`)); // l10n-ignore: 개발자 로그
    }, timeoutMs);

    task.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const renderImage = async (
  request: StaticMapImageRequest,
  target: File
): Promise<string | null> => {
  const manager = loadStaticMapImageManager();

  if (!manager) {
    return null;
  }

  // 큐에서 기다리는 사이 다른 호출이 만들어 뒀을 수 있다.
  if (target.exists) {
    return target.uri;
  }

  /**
   * `width`/`height`는 **pt 그대로** 넘긴다. SDK 문서는 "pixels"라 적지만 네이티브 구현은 논리 크기다 —
   * iOS `MLNMapSnapshotOptions(size:)`는 pt(배율은 화면 scale 기본값), Android `MapSnapshotter.Options`는
   * dp에 `withPixelRatio(density)`를 곱한다. pt × `PixelRatio`를 넘기면 같은 줌에서 3배 넓은 땅이 작은
   * 글자로 찍힌다(MAP-3 줌 13·14가 어긋난다). 결과 PNG는 기기 배율 해상도라 선명하다.
   */
  const uri = await withTimeout(
    manager.createImage({
      mapStyle: MAP_STYLE_URL,
      center: [request.longitude, request.latitude],
      zoom: request.zoom,
      width: request.width,
      height: request.height,
      output: 'file',
      logo: false,
    }),
    CREATE_TIMEOUT_MS
  );
  const directory = getCacheDirectory();

  directory.create({ intermediates: true, idempotent: true });

  const temporary = new File(uri);

  await temporary.move(target);

  return target.uri;
};

/**
 * 정적 지도 썸네일 (MAP-3) — 기기에서 MapLibre로 렌더한 PNG의 `file://` URI. 배낭 목록 카드 밴드·스냅샷
 * 밴드·여행지 허브 미리보기가 쓴다(마커는 이미지에 싣지 않고 호출부가 `SpotPinView`를 얹는다).
 *
 * - 캐시 `cache/map-thumbs/{styleVersion}-{lat5}-{lng5}-{zoom}-{w}x{h}.png`가 있으면 바로 돌려준다.
 * - 생성은 동시 2개까지 줄 세운다. 같은 키의 동시 요청은 하나로 합친다. 한 장에 15초를 넘기면 실패로 친다.
 * - **오프라인이면 캐시만 본다** — 없으면 바로 `null`(빈 지면 PNG를 만들어 캐시하지 않는다).
 * - 실패한 키는 이 세션에서 다시 만들지 않는다(오프라인 → 온라인 전환 때 초기화).
 * - 실패·웹·옛 바이너리(MapLibre 없음)는 `null` — 호출부는 밴드 없는 폴백.
 * - 서버(Firestore·Storage)에는 올리지 않는다. 생성 중 화면을 떠나도 결과는 캐시에 남는다(§6).
 */
export const getStaticMapImage = async (
  request: StaticMapImageRequest,
  { isOffline }: StaticMapImageOptions
): Promise<string | null> => {
  if (wasOffline && !isOffline) {
    failedKeys.clear();
  }

  wasOffline = isOffline;

  if (Platform.OS === 'web' || !loadStaticMapImageManager()) {
    return null;
  }

  const size = {
    ...request,
    width: Math.round(request.width),
    height: Math.round(request.height),
  };

  if (size.width <= 0 || size.height <= 0) {
    return null;
  }

  const fileName = getCacheFileName(size);

  try {
    const target = new File(getCacheDirectory(), fileName);

    if (target.exists) {
      return target.uri;
    }

    if (isOffline || failedKeys.has(fileName)) {
      return null;
    }

    const pending = inFlight.get(fileName);

    if (pending) {
      return await pending;
    }

    const created = enqueue(() => renderImage(size, target)).catch(error => {
      console.warn('[StaticMapImage] 썸네일 생성 실패', error); // l10n-ignore: 개발자 로그

      return null;
    });

    inFlight.set(fileName, created);

    try {
      const uri = await created;

      if (uri === null) {
        failedKeys.add(fileName);
      }

      return uri;
    } finally {
      inFlight.delete(fileName);
    }
  } catch (error) {
    console.warn('[StaticMapImage] 썸네일 캐시 확인 실패', error); // l10n-ignore: 개발자 로그

    return null;
  }
};
